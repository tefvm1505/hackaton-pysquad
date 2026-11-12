import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Líneas de la factura. Desde 640px se muestra como tabla; en pantallas más
 * angostas, como lista, porque cinco columnas de montos no caben sin cortarse.
 */
export function InvoiceLinesTable({ invoice }) {
  const money = (value) => formatCurrency(value, invoice.currency)

  const totals = [
    { label: 'Subtotal', value: invoice.subtotal },
    { label: 'IVA', value: invoice.ivaAmount },
    { label: 'Total', value: invoice.total, strong: true },
  ]

  return (
    <>
      {/* Móvil */}
      <div className="sm:hidden">
        <ul className="divide-y">
          {invoice.lines.map((line) => (
            <li key={line.id} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm">{line.description}</p>
                <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                  {line.quantity} × {money(line.unitPrice)} · IVA {line.ivaRate}%
                </p>
              </div>
              <p className="shrink-0 text-sm font-medium tabular-nums">{money(line.total)}</p>
            </li>
          ))}
        </ul>

        <dl className="mt-2 space-y-1.5 rounded-md bg-muted/50 p-3 text-sm">
          {totals.map(({ label, value, strong }) => (
            <div key={label} className="flex justify-between gap-4">
              <dt className={cn(strong && 'font-semibold')}>{label}</dt>
              <dd className={cn('tabular-nums', strong && 'font-semibold')}>{money(value)}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Tableta y escritorio */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Cant.</TableHead>
              <TableHead className="text-right">Precio unit.</TableHead>
              <TableHead className="text-right">IVA</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell className="whitespace-normal">{line.description}</TableCell>
                <TableCell className="text-right tabular-nums">{line.quantity}</TableCell>
                <TableCell className="text-right tabular-nums">{money(line.unitPrice)}</TableCell>
                <TableCell className="text-right tabular-nums">{line.ivaRate}%</TableCell>
                <TableCell className="text-right tabular-nums">{money(line.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            {totals.map(({ label, value, strong }) => (
              <TableRow key={label}>
                <TableCell colSpan={4} className={cn('text-right', strong && 'font-semibold')}>
                  {label}
                </TableCell>
                <TableCell className={cn('text-right tabular-nums', strong && 'font-semibold')}>
                  {money(value)}
                </TableCell>
              </TableRow>
            ))}
          </TableFooter>
        </Table>
      </div>
    </>
  )
}
