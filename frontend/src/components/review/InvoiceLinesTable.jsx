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

export function InvoiceLinesTable({ invoice }) {
  const money = (value) => formatCurrency(value, invoice.currency)

  return (
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
        <TableRow>
          <TableCell colSpan={4} className="text-right">
            Subtotal
          </TableCell>
          <TableCell className="text-right tabular-nums">{money(invoice.subtotal)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell colSpan={4} className="text-right">
            IVA
          </TableCell>
          <TableCell className="text-right tabular-nums">{money(invoice.ivaAmount)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell colSpan={4} className="text-right font-semibold">
            Total
          </TableCell>
          <TableCell className="text-right font-semibold tabular-nums">
            {money(invoice.total)}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  )
}
