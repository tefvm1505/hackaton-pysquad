import { useCallback, useRef, useState } from 'react'
import {
  CloudUpload,
  FileText,
  Loader2,
  Sparkles,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react'
import { PageHeader } from '@/components/layouts/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiFetch } from '@/lib/api'
import { formatBytes } from '@/lib/format'
import { cn } from '@/lib/utils'

/* -------------------------------------------------------------------------- */
/* Dropzone                                                                    */
/* -------------------------------------------------------------------------- */

const MAX_FILE_BYTES = 10 * 1024 * 1024
const ACCEPT = '.pdf,.xml,.png,.jpg,.jpeg,.webp,.bmp,.tiff,image/*,application/pdf'

function Dropzone({ onFile, disabled }) {
  const [dragging, setDragging] = useState(false)
  const depth = useRef(0)

  function handleDrop(e) {
    e.preventDefault()
    depth.current = 0
    setDragging(false)
    if (e.dataTransfer.files?.[0]) onFile(e.dataTransfer.files[0])
  }

  function handleChange(e) {
    if (e.target.files?.[0]) onFile(e.target.files[0])
    e.target.value = ''
  }

  return (
    <label
      onDragEnter={(e) => { e.preventDefault(); depth.current += 1; setDragging(true) }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => { depth.current = Math.max(0, depth.current - 1); if (depth.current === 0) setDragging(false) }}
      onDrop={handleDrop}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-background px-6 py-12 text-center transition-colors',
        'hover:border-foreground/40 hover:bg-muted/30',
        dragging && 'border-foreground bg-muted/50',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <input type="file" accept={ACCEPT} onChange={handleChange} className="sr-only" disabled={disabled} />
      <span className="flex size-14 items-center justify-center rounded-full bg-muted">
        <CloudUpload aria-hidden className="size-7" />
      </span>
      <span className="text-base font-medium">
        {dragging ? 'Suelta el archivo aquí' : 'Arrastra tu factura aquí'}
      </span>
      <span className="text-sm text-muted-foreground">
        o <span className="font-medium text-foreground underline underline-offset-4">haz clic para seleccionarla</span>
      </span>
      <span className="text-xs text-muted-foreground">
        PDF, imagen o XML · hasta {formatBytes(MAX_FILE_BYTES)}
      </span>
    </label>
  )
}

/* -------------------------------------------------------------------------- */
/* Vista previa del archivo                                                    */
/* -------------------------------------------------------------------------- */

function FilePreview({ file, previewUrl }) {
  if (!file) return null

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  const isImage = file.type.startsWith('image/')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText aria-hidden className="size-5" />
          {file.name}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
      </CardHeader>
      <CardContent>
        {isPdf && previewUrl && (
          <iframe
            src={previewUrl}
            title={`Vista previa de ${file.name}`}
            className="h-[500px] w-full rounded-lg border"
          />
        )}
        {isImage && previewUrl && (
          <img
            src={previewUrl}
            alt={`Vista previa de ${file.name}`}
            className="max-h-[500px] w-full rounded-lg border object-contain bg-muted/30"
          />
        )}
        {!isPdf && !isImage && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
            <FileText aria-hidden className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Vista previa no disponible para este tipo de archivo.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Panel del asistente IA                                                      */
/* -------------------------------------------------------------------------- */

const THINKING_PHRASES = [
  'Leyendo el documento...',
  'Extrayendo datos de la factura...',
  'Validando contra el contrato...',
  'Verificando montos e IVA...',
  'Generando análisis con IA...',
]

function ThinkingAnimation() {
  const [phraseIndex, setPhraseIndex] = useState(0)

  useState(() => {
    const id = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % THINKING_PHRASES.length)
    }, 2500)
    return () => clearInterval(id)
  })

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="relative">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
          <Sparkles aria-hidden className="size-8 text-primary animate-pulse" />
        </span>
        <Loader2 aria-hidden className="absolute -top-2 -right-2 size-6 text-primary animate-spin" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold">Analizando tu documento</p>
        <p key={phraseIndex} className="mt-1 text-xs text-muted-foreground animate-in fade-in duration-500">
          {THINKING_PHRASES[phraseIndex]}
        </p>
      </div>
      {/* Barra de progreso animada */}
      <div className="w-full max-w-[200px] h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary animate-progress" />
      </div>
    </div>
  )
}

function AiPanel({ status, response, error, className }) {
  const isIdle = status === 'idle'
  const isThinking = status === 'uploading'
  const isDone = status === 'done'
  const isFailed = status === 'error'

  return (
    <Card className={cn('relative isolate overflow-hidden', className)}>
      {/* Fondo animado mientras piensa */}
      <div
        aria-hidden
        className={cn(
          '-z-10 pointer-events-none absolute inset-0 bg-[length:300%_100%] transition-opacity duration-700',
          'bg-[linear-gradient(110deg,oklch(0.95_0.04_295),oklch(0.96_0.03_230),oklch(0.96_0.04_345),oklch(0.95_0.04_295))]',
          isThinking ? 'opacity-100 animate-aurora [animation-duration:3.5s]' : isDone || isFailed ? 'opacity-0' : 'opacity-60 animate-aurora',
        )}
      />

      <CardHeader>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground',
              isThinking && 'animate-pulse',
            )}
          >
            <Sparkles aria-hidden className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <CardTitle>Asistente de Facto</CardTitle>
            <p className="text-sm text-muted-foreground">
              {isIdle && 'Sube un documento para que lo analice'}
              {isThinking && 'Procesando tu documento...'}
              {isDone && 'Análisis completado'}
              {isFailed && 'Hubo un problema'}
            </p>
          </div>
          <Badge variant="outline" className="shrink-0 bg-background/60">IA</Badge>
        </div>
      </CardHeader>

      <CardContent>
        {isIdle && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Sparkles aria-hidden className="size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Quiero analizar tu factura. Súbela y te cuento qué encontré.</p>
          </div>
        )}

        {isThinking && <ThinkingAnimation />}

        {isDone && response && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-start gap-2">
              <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-success" />
              <p className="text-sm font-medium">Documento procesado exitosamente</p>
            </div>
            <div className="rounded-xl bg-muted/40 p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Resultado del análisis</p>
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">{response}</p>
            </div>
            <p className="flex gap-2 border-t pt-3 text-xs text-muted-foreground">
              <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              La IA puede equivocarse. Verifica los datos en la sección de facturas.
            </p>
          </div>
        )}

        {isFailed && (
          <div className="space-y-3 animate-in fade-in duration-300">
            <div className="flex items-start gap-2">
              <XCircle aria-hidden className="mt-0.5 size-5 shrink-0 text-danger" />
              <p className="text-sm font-medium">No se pudo procesar el documento</p>
            </div>
            <div className="rounded-xl border border-danger/30 bg-danger-soft p-4">
              <p className="text-sm text-foreground">{error}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Página principal                                                            */
/* -------------------------------------------------------------------------- */

export default function UploadPage() {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [status, setStatus] = useState('idle') // idle | uploading | done | error
  const [response, setResponse] = useState(null)
  const [error, setError] = useState(null)

  const upload = useCallback(async (selectedFile) => {
    // Limpiar estado anterior
    setFile(selectedFile)
    setResponse(null)
    setError(null)
    setStatus('uploading')

    // Crear preview URL
    const url = URL.createObjectURL(selectedFile)
    setPreviewUrl(url)

    try {
      const token = sessionStorage.getItem('facto:token')
      const formData = new FormData()
      formData.append('archivo', selectedFile)

      const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

      const res = await fetch(`${BASE_URL}/subir`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      })

      if (!res.ok) {
        const detail = await res.json().catch(() => null)
        throw new Error(detail?.detail ?? `Error ${res.status} al subir el documento`)
      }

      const data = await res.json()
      // El backend retorna un string con la respuesta de la IA
      setResponse(typeof data === 'string' ? data : JSON.stringify(data, null, 2))
      setStatus('done')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }, [])

  function handleFile(selectedFile) {
    if (selectedFile.size > MAX_FILE_BYTES) {
      setError(`El archivo pesa ${formatBytes(selectedFile.size)} y el máximo es ${formatBytes(MAX_FILE_BYTES)}.`)
      setStatus('error')
      return
    }
    void upload(selectedFile)
  }

  return (
    <>
      <PageHeader
        title="Carga de documentos"
        description="Sube facturas en PDF o imagen. Facto las lee, las valida y te explica qué encontró."
      />

      <div className="grid items-start gap-6 xl:grid-cols-2">
        {/* Columna izquierda: dropzone + preview */}
        <div className="space-y-6">
          <Dropzone onFile={handleFile} disabled={status === 'uploading'} />
          <FilePreview file={file} previewUrl={previewUrl} />
        </div>

        {/* Columna derecha: panel IA */}
        <AiPanel
          status={status}
          response={response}
          error={error}
          className="xl:sticky xl:top-8"
        />
      </div>
    </>
  )
}
