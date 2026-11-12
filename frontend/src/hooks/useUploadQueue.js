import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, uploadInvoice } from '@/lib/api'
import { MAX_FILES_PER_BATCH, getExtension, validateFile } from '@/lib/uploadRules'

/**
 * Estados de cada documento en la cola:
 *  - uploading: subiendo el archivo (hay `progress` de 0 a 100)
 *  - analyzing: la IA lo lee y lo valida (hay `stage`)
 *  - done:      se leyó y generó una factura (`invoice` + `analysis`)
 *  - failed:    no se pudo leer (`analysis` de la IA) o falló la carga (`error`)
 *  - rejected:  el navegador lo descartó antes de subirlo (`error` con el motivo)
 */
const FINISHED = new Set(['done', 'failed', 'rejected'])

const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`

const fileKey = (file) => `${file.name}|${file.size}|${file.lastModified}`

function technicalMessage(error) {
  if (error instanceof ApiError && error.status === 413) return 'El archivo supera el tamaño permitido.'
  if (error instanceof ApiError && error.status === 401) return 'Tu sesión venció. Inicia sesión de nuevo.'
  return 'No se pudo completar la carga. Inténtalo de nuevo en unos minutos.'
}

export function useUploadQueue() {
  const [items, setItems] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const mounted = useRef(true)
  // Claves de archivos ya recibidos, para no subir dos veces el mismo documento.
  const seen = useRef(new Set())

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const patch = useCallback((id, changes) => {
    if (!mounted.current) return
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)))
  }, [])

  const run = useCallback(
    async (id, file) => {
      try {
        const result = await uploadInvoice(file, {
          onProgress: (progress) => patch(id, { progress }),
          onStage: (stage) => patch(id, { stage, status: stage === 'upload' ? 'uploading' : 'analyzing' }),
        })
        const unreadable = result.analysis.outcome === 'unreadable'
        patch(id, {
          status: unreadable ? 'failed' : 'done',
          stage: null,
          progress: 100,
          analysis: result.analysis,
          invoice: result.invoice ?? null,
        })
      } catch (error) {
        patch(id, { status: 'failed', stage: null, error: technicalMessage(error) })
      }
    },
    [patch],
  )

  /** Recibe archivos (arrastrados o elegidos), los valida y arranca la carga de los válidos. */
  const addFiles = useCallback(
    async (fileList) => {
      const files = [...fileList]
      if (files.length === 0) return

      const created = files.map((file, index) => ({
        id: newId(),
        file,
        key: fileKey(file),
        extension: getExtension(file.name),
        index,
      }))

      setItems((prev) => [
        ...prev,
        ...created.map(({ id, file, key, extension }) => ({
          id,
          key,
          name: file.name,
          size: file.size,
          extension,
          status: 'uploading',
          progress: 0,
          stage: 'upload',
          error: null,
          analysis: null,
          invoice: null,
        })),
      ])
      setSelectedId(created[0].id)

      await Promise.all(
        created.map(async ({ id, file, key, index }) => {
          let error = null
          if (index >= MAX_FILES_PER_BATCH) {
            error = `Superó el máximo de ${MAX_FILES_PER_BATCH} archivos por carga.`
          } else if (seen.current.has(key)) {
            error = 'Este documento ya está en la lista.'
          } else {
            // Se reserva la clave ANTES de validar (la validación es asíncrona): así, dos
            // copias del mismo archivo en una misma carga no pasan las dos.
            seen.current.add(key)
            error = await validateFile(file)
            if (error) seen.current.delete(key)
          }

          if (error) {
            patch(id, { status: 'rejected', stage: null, error })
            return
          }

          await run(id, file)
        }),
      )
    },
    [patch, run],
  )

  /** Libera la clave de un documento retirado para que pueda volver a subirse. */
  const forget = useCallback((item) => {
    if (item.status === 'done' || item.status === 'failed') seen.current.delete(item.key)
  }, [])

  const remove = useCallback(
    (id) => {
      const target = items.find((item) => item.id === id)
      if (!target || !FINISHED.has(target.status)) return
      forget(target)
      setItems((prev) => prev.filter((item) => item.id !== id))
      setSelectedId((current) => (current === id ? null : current))
    },
    [items, forget],
  )

  const clearFinished = useCallback(() => {
    for (const item of items) if (FINISHED.has(item.status)) forget(item)
    setItems((prev) => prev.filter((item) => !FINISHED.has(item.status)))
  }, [items, forget])

  const selected = items.find((item) => item.id === selectedId) ?? null

  return { items, selected, selectedId, select: setSelectedId, addFiles, remove, clearFinished }
}

export { FINISHED }
