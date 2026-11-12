import { FileCode, FileText, LoaderCircle, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceStatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ROUTES } from '@/config/routes'
import { FINISHED } from '@/hooks/useUploadQueue'
import { formatBytes } from '@/lib/format'
import { LIGHT_STYLES } from '@/lib/semaphore'
import { cn } from '@/lib/utils'

const STAGE_LABEL = {
  upload: 'Subiendo documento',
  read: 'Leyendo y extrayendo datos',
  validate: 'Validando orden de compra e IVA',
  check: 'Buscando duplicados y verificando proveedor',
}

/** Texto corto de estado bajo el nombre del archivo. */
function statusText(item) {
  switch (item.status) {
    case 'uploading':
      return `Subiendo… ${item.progress}%`
    case 'analyzing':
      return `${STAGE_LABEL[item.stage] ?? 'Analizando'}…`
    case 'done':
      return item.invoice ? `Factura ${item.invoice.invoiceNumber}` : 'Procesado'
    case 'failed':
      return item.error ?? 'No se pudo leer el documento'
    case 'rejected':
      return item.error
    default:
      return ''
  }
}

function RedPill({ children }) {
  return (
    <Badge variant="outline" className={cn('font-medium', LIGHT_STYLES.red.badge)}>
      {children}
    </Badge>
  )
}

function ItemBadge({ item }) {
  if (item.status === 'done') return <InvoiceStatusBadge status={item.invoice.status} />
  if (item.status === 'failed') return <RedPill>No se pudo leer</RedPill>
  if (item.status === 'rejected') return <RedPill>Rechazado</RedPill>
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <LoaderCircle aria-hidden className="size-4 animate-spin" />
      {item.status === 'uploading' ? 'Subiendo' : 'Analizando'}
    </span>
  )
}

function QueueItem({ item, selected, onSelect, onRemove }) {
  const Icon = item.extension === 'xml' ? FileCode : FileText
  const finished = FINISHED.has(item.status)

  return (
    <li className={cn('flex items-center gap-2 px-2 py-1 transition-colors', selected && 'bg-muted/60')}>
      <button
        type="button"
        onClick={() => onSelect(item.id)}
        aria-current={selected ? 'true' : undefined}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Icon aria-hidden className="size-8 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium" title={item.name}>
            {item.name}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {formatBytes(item.size)} · {statusText(item)}
          </span>
          {item.status === 'uploading' && (
            <Progress value={item.progress} className="mt-2" aria-label={`Progreso de ${item.name}`} />
          )}
          {/* En pantallas angostas el estado va debajo del nombre; desde 640px, a la derecha. */}
          <span className="mt-1.5 block sm:hidden">
            <ItemBadge item={item} />
          </span>
        </span>
        <span className="hidden shrink-0 sm:block">
          <ItemBadge item={item} />
        </span>
      </button>

      {item.status === 'done' && item.invoice && (
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link to={ROUTES.invoiceReview(item.invoice.id)}>Revisar</Link>
        </Button>
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0"
        disabled={!finished}
        onClick={() => onRemove(item.id)}
        aria-label={finished ? `Quitar ${item.name} de la lista` : `${item.name} se está procesando`}
      >
        <Trash2 />
      </Button>
    </li>
  )
}

export function UploadQueue({ items, selectedId, onSelect, onRemove, onClear, className }) {
  if (items.length === 0) return null
  const finished = items.filter((item) => FINISHED.has(item.status)).length

  return (
    <section aria-labelledby="queue-title" className={cn('overflow-hidden rounded-xl border bg-background', className)}>
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <h2 id="queue-title" className="text-sm font-semibold">
          Documentos <span className="font-normal text-muted-foreground">({items.length})</span>
        </h2>
        {finished > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            Limpiar finalizados
          </Button>
        )}
      </div>
      <ul className="divide-y">
        {items.map((item) => (
          <QueueItem
            key={item.id}
            item={item}
            selected={item.id === selectedId}
            onSelect={onSelect}
            onRemove={onRemove}
          />
        ))}
      </ul>
    </section>
  )
}
