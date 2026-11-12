import { ClipboardCopy, Eye, FileSearch, MoreHorizontal } from 'lucide-react'
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

export function ExceptionRowActions({ exception, onOpen }) {
  async function copyId() {
    try {
      await navigator.clipboard.writeText(exception.id)
      toast.success('ID copiado', { description: exception.id })
    } catch {
      toast.error('No se pudo copiar al portapapeles')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Acciones de la excepción ${exception.code}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-52">
        <DropdownMenuLabel className="font-mono text-xs">{exception.code}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onOpen(exception)} className="gap-2 py-2 whitespace-nowrap">
          <Eye />
          {exception.status === 'open' ? 'Ver y resolver' : 'Ver detalle'}
        </DropdownMenuItem>
        {exception.invoiceId && (
          <DropdownMenuItem asChild className="gap-2 py-2 whitespace-nowrap">
            <Link to={ROUTES.invoiceReview(exception.invoiceId)}>
              <FileSearch />
              Ver factura
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={copyId} className="gap-2 py-2 whitespace-nowrap">
          <ClipboardCopy />
          Copiar ID
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
