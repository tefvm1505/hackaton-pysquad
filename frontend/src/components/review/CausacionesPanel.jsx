import { CircleCheck, CircleX, Clock, ExternalLink, FileSignature, OctagonAlert, ReceiptText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/config/routes'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const ESTADO_CONFIG = {
  validada: {
    label: 'Validada',
    icon: CircleCheck,
    classes: 'border-success/30 bg-success-soft',
    dot: 'bg-success',
    badgeClasses: 'border-success/40 bg-success/10 text-success',
  },
  aprobada: {
    label: 'Aprobada',
    icon: CircleCheck,
    classes: 'border-success/30 bg-success-soft',
    dot: 'bg-success',
    badgeClasses: 'border-success/40 bg-success/10 text-success',
  },
  rechazada: {
    label: 'Rechazada',
    icon: CircleX,
    classes: 'border-danger/30 bg-danger-soft',
    dot: 'bg-danger',
    badgeClasses: 'border-danger/40 bg-danger/10 text-danger',
  },
  'con errores': {
    label: 'Con errores',
    icon: OctagonAlert,
    classes: 'border-danger/30 bg-danger-soft',
    dot: 'bg-danger',
    badgeClasses: 'border-danger/40 bg-danger/10 text-danger',
  },
  'requiere revision': {
    label: 'Requiere revisión',
    icon: Clock,
    classes: 'border-warning/30 bg-warning-soft',
    dot: 'bg-warning',
    badgeClasses: 'border-warning/40 bg-warning/10 text-warning',
  },
}

const DEFAULT_CONFIG = {
  label: 'Pendiente',
  icon: Clock,
  classes: 'border-muted-foreground/20 bg-muted/50',
  dot: 'bg-muted-foreground',
  badgeClasses: 'border-muted-foreground/30 bg-muted text-muted-foreground',
}

function getConfig(estado) {
  if (!estado) return DEFAULT_CONFIG
  return ESTADO_CONFIG[estado.toLowerCase().trim()] ?? DEFAULT_CONFIG
}

/**
 * Link pequeño con icono que navega al detalle de factura o contrato.
 */
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

/**
 * Panel que muestra las causaciones asociadas a una factura.
 * Cada causación incluye estado, sugerencia de la IA, fecha,
 * y links clickeables a la factura y al contrato.
 */
export function CausacionesPanel({ causaciones }) {
  if (!causaciones || causaciones.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <ReceiptText aria-hidden className="size-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Esta factura no tiene causaciones registradas.</p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-4">
      {causaciones.map((causacion, index) => {
        const config = getConfig(causacion.estado)
        const Icon = config.icon

        return (
          <li key={causacion.id} className={cn('rounded-xl border p-5 transition-shadow hover:shadow-md', config.classes)}>
            {/* Encabezado: estado + fecha */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon aria-hidden className="size-5 shrink-0" />
                <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold', config.badgeClasses)}>
                  <span aria-hidden className={cn('size-2 rounded-full', config.dot)} />
                  {config.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  #{index + 1}
                </span>
              </div>
              {causacion.fechaCausacion && (
                <time className="text-xs text-muted-foreground tabular-nums">
                  {formatDateTime(causacion.fechaCausacion)}
                </time>
              )}
            </div>

            {/* Descripción / sugerencia de la IA */}
            {causacion.sugerencia && (
              <div className="mt-3 rounded-lg bg-background/60 p-3.5">
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
                  {causacion.sugerencia}
                </p>
              </div>
            )}

            {/* Links a factura y contrato */}
            {(causacion.invoiceId || causacion.contractId) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {causacion.invoiceId && (
                  <IdLink
                    to={ROUTES.invoiceReview(causacion.invoiceId)}
                    icon={ReceiptText}
                    label="Factura"
                    id={causacion.invoiceId}
                  />
                )}
                {causacion.contractId && (
                  <IdLink
                    to={ROUTES.contractReview(causacion.contractId)}
                    icon={FileSignature}
                    label="Contrato"
                    id={causacion.contractId}
                  />
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
