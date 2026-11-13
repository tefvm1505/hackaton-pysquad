import { useMemo, useState } from 'react'
import {
  CircleCheck,
  CircleX,
  Clock,
  ExternalLink,
  FileSignature,
  OctagonAlert,
  ReceiptText,
  RefreshCw,
  Search,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layouts/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ROUTES } from '@/config/routes'
import { useAsync } from '@/hooks/useAsync'
import { listCausaciones } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { LIGHT_STYLES } from '@/lib/semaphore'
import { cn } from '@/lib/utils'

/* -------------------------------------------------------------------------- */
/* Configuración de estados                                                    */
/* -------------------------------------------------------------------------- */

const ESTADO_CONFIG = {
  validada: { label: 'Validada', icon: CircleCheck, light: 'green' },
  aprobada: { label: 'Aprobada', icon: CircleCheck, light: 'green' },
  rechazada: { label: 'Rechazada', icon: CircleX, light: 'red' },
  'con errores': { label: 'Con errores', icon: OctagonAlert, light: 'red' },
  'requiere revision': { label: 'Requiere revisión', icon: Clock, light: 'yellow' },
}

const DEFAULT_CONFIG = { label: 'Pendiente', icon: Clock, light: 'yellow' }

function getConfig(estado) {
  if (!estado) return DEFAULT_CONFIG
  return ESTADO_CONFIG[estado.toLowerCase().trim()] ?? DEFAULT_CONFIG
}

/* -------------------------------------------------------------------------- */
/* Summary cards                                                               */
/* -------------------------------------------------------------------------- */

function Stat({ label, value, icon: Icon, tone }) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3">
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl',
            tone ? cn('border', LIGHT_STYLES[tone].panel) : 'bg-muted',
          )}
        >
          <Icon aria-hidden className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-2xl leading-none font-semibold tabular-nums">{value}</p>
          <p className="mt-1 text-xs leading-tight text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function CausacionesSummary({ items }) {
  const counts = useMemo(() => {
    const result = { total: items.length, validadas: 0, rechazadas: 0, errores: 0 }
    for (const c of items) {
      const key = c.estado?.toLowerCase().trim()
      if (key === 'validada' || key === 'aprobada') result.validadas++
      else if (key === 'rechazada') result.rechazadas++
      else result.errores++
    }
    return result
  }, [items])

  return (
    <section aria-label="Resumen de causaciones" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Total causaciones" value={counts.total} icon={ReceiptText} />
      <Stat label="Validadas" value={counts.validadas} icon={CircleCheck} tone="green" />
      <Stat label="Con errores" value={counts.errores} icon={OctagonAlert} tone="yellow" />
      <Stat label="Rechazadas" value={counts.rechazadas} icon={CircleX} tone="red" />
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* Link pequeño a factura / contrato                                           */
/* -------------------------------------------------------------------------- */

function IdLink({ to, icon: Icon, label, id }) {
  return (
    <Link
      to={to}
      className="group inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background/80 px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <Icon aria-hidden className="size-3.5 shrink-0 text-muted-foreground group-hover:text-accent-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="truncate max-w-[10rem]">{id}</span>
      <ExternalLink aria-hidden className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  )
}

/* -------------------------------------------------------------------------- */
/* Card de causación                                                            */
/* -------------------------------------------------------------------------- */

function CausacionCard({ causacion, onClick }) {
  const config = getConfig(causacion.estado)
  const Icon = config.icon
  const styles = LIGHT_STYLES[config.light]

  return (
    <li
      className={cn(
        'rounded-xl border p-5 transition-all cursor-pointer hover:shadow-md',
        styles.panel,
      )}
      onClick={() => onClick(causacion)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(causacion)}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon aria-hidden className="size-5 shrink-0" />
          <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold', styles.badge)}>
            <span aria-hidden className={cn('size-2 rounded-full', styles.dot)} />
            {config.label}
          </span>
        </div>
        {causacion.fechaCausacion && (
          <time className="text-xs text-muted-foreground tabular-nums">
            {formatDateTime(causacion.fechaCausacion)}
          </time>
        )}
      </div>

      {/* Sugerencia (truncada) */}
      {causacion.sugerencia && (
        <p className="mt-3 text-sm leading-relaxed text-foreground line-clamp-3">
          {causacion.sugerencia}
        </p>
      )}

      {/* Links */}
      {(causacion.invoiceId || causacion.contractId) && (
        <div className="mt-3 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
          {causacion.invoiceId && (
            <IdLink to={ROUTES.invoiceReview(causacion.invoiceId)} icon={ReceiptText} label="Factura" id={causacion.invoiceId} />
          )}
          {causacion.contractId && (
            <IdLink to={ROUTES.contractReview(causacion.contractId)} icon={FileSignature} label="Contrato" id={causacion.contractId} />
          )}
        </div>
      )}
    </li>
  )
}

/* -------------------------------------------------------------------------- */
/* Dialog de detalle                                                           */
/* -------------------------------------------------------------------------- */

function CausacionDetailDialog({ causacion, onClose }) {
  if (!causacion) return null
  const config = getConfig(causacion.estado)
  const Icon = config.icon
  const styles = LIGHT_STYLES[config.light]

  return (
    <Dialog open={causacion !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon aria-hidden className="size-5" />
            Causación #{causacion.id}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Detalle de la causación {causacion.id}
          </DialogDescription>
        </DialogHeader>

        {/* Badge de estado */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold', styles.badge)}>
            <span aria-hidden className={cn('size-2.5 rounded-full', styles.dot)} />
            {config.label}
          </span>
          {causacion.fechaCausacion && (
            <span className="text-sm text-muted-foreground tabular-nums">
              {formatDateTime(causacion.fechaCausacion)}
            </span>
          )}
        </div>

        {/* Sugerencia completa */}
        {causacion.sugerencia && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Sugerencia de la IA</p>
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
              {causacion.sugerencia}
            </p>
          </div>
        )}

        {/* Links a factura y contrato */}
        <div className="grid gap-3 sm:grid-cols-2">
          {causacion.invoiceId && (
            <Link
              to={ROUTES.invoiceReview(causacion.invoiceId)}
              className="group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <ReceiptText aria-hidden className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Factura</p>
                <p className="truncate text-sm font-medium">{causacion.invoiceId}</p>
              </div>
              <ExternalLink aria-hidden className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          )}
          {causacion.contractId && (
            <Link
              to={ROUTES.contractReview(causacion.contractId)}
              className="group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <FileSignature aria-hidden className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Contrato</p>
                <p className="truncate text-sm font-medium">{causacion.contractId}</p>
              </div>
              <ExternalLink aria-hidden className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* -------------------------------------------------------------------------- */
/* Página principal                                                            */
/* -------------------------------------------------------------------------- */

const STATUS_FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'validada', label: 'Validadas' },
  { value: 'con errores', label: 'Con errores' },
  { value: 'rechazada', label: 'Rechazadas' },
]

export default function ExceptionsPage() {
  const { data, error, isLoading, reload } = useAsync(listCausaciones, [])
  const [selectedId, setSelectedId] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const selected = data?.find((c) => c.id === selectedId) ?? null

  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter((c) => {
      // Filtro por estado
      if (statusFilter !== 'all') {
        const estado = c.estado?.toLowerCase().trim() ?? ''
        if (statusFilter === 'validada' && estado !== 'validada' && estado !== 'aprobada') return false
        if (statusFilter === 'rechazada' && estado !== 'rechazada') return false
        if (statusFilter === 'con errores' && estado !== 'con errores' && estado !== 'requiere revision') return false
      }
      // Filtro por búsqueda
      if (search) {
        const q = search.toLowerCase()
        const haystack = `${c.sugerencia ?? ''} ${c.estado ?? ''} ${c.invoiceId ?? ''} ${c.contractId ?? ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [data, statusFilter, search])

  return (
    <>
      <PageHeader
        title="Causaciones"
        description="Resultados de validación automática de facturas con sugerencias de la IA."
        actions={
          <Button variant="outline" onClick={reload} disabled={isLoading}>
            <RefreshCw className={isLoading ? 'animate-spin' : undefined} />
            Actualizar
          </Button>
        }
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudieron cargar las causaciones</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : !data ? (
        <p role="status" className="py-12 text-center text-sm text-muted-foreground">
          Cargando causaciones…
        </p>
      ) : (
        <>
          <CausacionesSummary items={data} />

          {/* Filtros */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex gap-1.5 rounded-lg bg-muted p-1">
              {STATUS_FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    statusFilter === value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="relative ml-auto w-full sm:w-72">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar en sugerencias, factura o contrato"
                aria-label="Buscar causaciones"
                className="h-9 pl-8"
              />
            </div>
          </div>

          {/* Lista */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border bg-background py-16 text-center">
              <ReceiptText aria-hidden className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No hay causaciones que coincidan con los filtros.</p>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((causacion) => (
                <CausacionCard
                  key={causacion.id}
                  causacion={causacion}
                  onClick={(c) => setSelectedId(c.id)}
                />
              ))}
            </ul>
          )}

          <CausacionDetailDialog causacion={selected} onClose={() => setSelectedId(null)} />
        </>
      )}
    </>
  )
}
