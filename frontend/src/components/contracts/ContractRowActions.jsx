import { ClipboardCheck, ClipboardCopy, Eye, MoreHorizontal } from 'lucide-react'
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
import { REVIEWABLE_CONTRACT_STATUSES } from '@/lib/semaphore'

export function ContractRowActions({ contract }) {
  const canReview = REVIEWABLE_CONTRACT_STATUSES.has(contract.status)

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(contract.contractNumber)
      toast.success('Número copiado', { description: contract.contractNumber })
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
          aria-label={`Acciones del contrato ${contract.contractNumber}`}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-52">
        <DropdownMenuLabel>{contract.contractNumber}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="gap-2 py-2 whitespace-nowrap">
          <Link to={ROUTES.contractReview(contract.id)}>
            {canReview ? <ClipboardCheck /> : <Eye />}
            {canReview ? 'Revisar contrato' : 'Ver detalle'}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={copyNumber} className="gap-2 py-2 whitespace-nowrap">
          <ClipboardCopy />
          Copiar número
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
