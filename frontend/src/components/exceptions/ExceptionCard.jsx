import { Link } from 'react-router-dom'
import { ROUTES } from '@/config/routes'
import { formatDateTime } from '@/lib/format'
import { EXCEPTION_STAGE } from '@/lib/semaphore'
import { ExceptionBadgeGroup } from './ExceptionBadges'
import { ExceptionRowActions } from './ExceptionRowActions'

/**
 * Excepción como tarjeta, para pantallas donde la tabla no cabe (menos de 1024px).
 * Todo el cuerpo de la tarjeta abre el detalle; el enlace de la factura y el menú
 * quedan por encima para seguir siendo clicables.
 */
export function ExceptionCard({ exception, onOpen }) {
  return (
    <li className="relative rounded-lg border bg-background p-4 transition-colors hover:bg-muted/40">
      <div className="flex items-start justify-between gap-3">
        <ExceptionBadgeGroup exception={exception} />
        <div className="relative z-10 -mt-1 -mr-2 shrink-0">
          <ExceptionRowActions exception={exception} onOpen={onOpen} />
        </div>
      </div>

      <button
        type="button"
        onClick={() => onOpen(exception)}
        className="mt-3 block w-full text-left text-sm leading-snug outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring"
      >
        {exception.message}
      </button>

      <p className="mt-1 font-mono text-xs text-muted-foreground">{exception.code}</p>

      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
        <span>{formatDateTime(exception.occurredAt)}</span>
        <span>{EXCEPTION_STAGE[exception.stage]}</span>
        {exception.invoiceId && (
          <Link
            to={ROUTES.invoiceReview(exception.invoiceId)}
            className="relative z-10 font-medium text-foreground underline-offset-4 hover:underline"
          >
            {exception.invoiceNumber}
          </Link>
        )}
      </p>
    </li>
  )
}
