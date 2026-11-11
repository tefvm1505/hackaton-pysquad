import { ClipboardCheck, ClipboardCopy, MoreHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ROUTES } from '@/config/routes'
import { REVIEWABLE_STATUSES } from '@/lib/semaphore'

export function InvoiceRowActions({ invoice }) {
  const canReview = REVIEWABLE_STATUSES.has(invoice.status)

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(invoice.invoiceNumber)
      toast.success('Número copiado', { description: invoice.invoiceNumber })
    } catch {
      toast.error('No se pudo copiar al portapapeles')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Acciones de la factura ${invoice.invoiceNumber}`}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{invoice.invoiceNumber}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={ROUTES.invoiceReview(invoice.id)}>
            <ClipboardCheck />
            {canReview ? 'Revisar factura' : 'Ver detalle'}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={copyNumber}>
          <ClipboardCopy />
          Copiar número
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
