import { Link } from 'react-router-dom'
import { ROUTES } from '@/config/routes'
import { formatCurrency, formatDate } from '@/lib/format'
import { InvoiceRowActions } from './InvoiceRowActions'
import { InvoiceStatusBadge } from './InvoiceStatusBadge'

/**
 * Factura como tarjeta, para pantallas donde la tabla no cabe (menos de 1024px).
 * Toda la tarjeta es tocable: el enlace del número se estira sobre ella y el
 * menú de acciones queda por encima.
 */
export function InvoiceCard({ invoice }) {
  const attention = invoice.findings.filter((f) => f.severity !== 'info').length

  return (
    <li className="relative rounded-lg border bg-background p-4 transition-colors hover:bg-muted/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={ROUTES.invoiceReview(invoice.id)}
            className="font-medium underline-offset-4 after:absolute after:inset-0 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            {invoice.invoiceNumber}
          </Link>
          <p className="mt-0.5 truncate text-sm">{invoice.supplierName}</p>
          <p className="text-xs text-muted-foreground">NIT {invoice.supplierNit}</p>
        </div>
        <div className="relative z-10 -mt-1 -mr-2 shrink-0">
          <InvoiceRowActions invoice={invoice} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <InvoiceStatusBadge status={invoice.status} />
        <p className="text-base font-semibold tabular-nums">
          {formatCurrency(invoice.total, invoice.currency)}
        </p>
      </div>

      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
        <span>{invoice.purchaseOrderNumber || 'Sin OC'}</span>
        <span>Emitida {formatDate(invoice.issueDate)}</span>
        {attention > 0 && (
          <span className="font-medium text-foreground">
            {attention} {attention === 1 ? 'hallazgo' : 'hallazgos'}
          </span>
        )}
      </p>
    </li>
  )
}
