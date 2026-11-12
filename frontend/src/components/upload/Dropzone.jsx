import { useEffect, useRef, useState } from 'react'
import { CloudUpload } from 'lucide-react'
import { formatBytes } from '@/lib/format'
import { ACCEPT_ATTR, MAX_FILE_BYTES, MAX_FILES_PER_BATCH } from '@/lib/uploadRules'
import { cn } from '@/lib/utils'

/**
 * Zona para arrastrar o elegir documentos.
 * Es un <label> con un <input type="file"> oculto: así funciona con teclado
 * (Tab + Enter/Espacio) y con lectores de pantalla sin código extra.
 */
export function Dropzone({ onFiles }) {
  const [dragging, setDragging] = useState(false)
  // dragenter/dragleave se disparan también al pasar sobre los hijos: se cuenta la profundidad.
  const depth = useRef(0)

  // Si se suelta un archivo fuera de la zona, el navegador lo abriría y se perdería la pantalla.
  useEffect(() => {
    const prevent = (event) => {
      if (event.dataTransfer?.types?.includes('Files')) event.preventDefault()
    }
    window.addEventListener('dragover', prevent)
    window.addEventListener('drop', prevent)
    return () => {
      window.removeEventListener('dragover', prevent)
      window.removeEventListener('drop', prevent)
    }
  }, [])

  function handleDrop(event) {
    event.preventDefault()
    depth.current = 0
    setDragging(false)
    if (event.dataTransfer.files?.length) onFiles(event.dataTransfer.files)
  }

  function handleChange(event) {
    if (event.target.files?.length) onFiles(event.target.files)
    // Permite volver a elegir el mismo archivo después.
    event.target.value = ''
  }

  return (
    <label
      onDragEnter={(event) => {
        event.preventDefault()
        depth.current += 1
        setDragging(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1)
        if (depth.current === 0) setDragging(false)
      }}
      onDrop={handleDrop}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-background px-6 py-10 text-center transition-colors',
        'hover:border-foreground/40 hover:bg-muted/30 has-focus-visible:border-ring has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
        dragging && 'border-foreground bg-muted/50',
      )}
    >
      <input
        type="file"
        multiple
        accept={ACCEPT_ATTR}
        onChange={handleChange}
        className="sr-only"
        aria-label="Seleccionar facturas en PDF o XML"
      />

      <span className="flex size-12 items-center justify-center rounded-full bg-muted">
        <CloudUpload aria-hidden className="size-6" />
      </span>
      <span className="text-base font-medium">
        {dragging ? 'Suelta los archivos aquí' : 'Arrastra tus facturas aquí'}
      </span>
      <span className="text-sm text-muted-foreground">
        o <span className="font-medium text-foreground underline underline-offset-4">haz clic para seleccionarlas</span>
      </span>
      <span className="text-xs text-muted-foreground">
        PDF o XML (UBL) · hasta {formatBytes(MAX_FILE_BYTES)} cada uno · máximo {MAX_FILES_PER_BATCH} archivos por carga
      </span>
    </label>
  )
}
