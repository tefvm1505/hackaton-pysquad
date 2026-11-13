import { Link } from 'react-router-dom'
import { ROUTES } from '@/config/routes'
import { formatCurrency, formatDate } from '@/lib/format'
import { CONTRACT_TYPE } from '@/lib/semaphore'
import { ContractRowActions } from './ContractRowActions'
import { ContractStatusBadge } from './ContractStatusBadge'

/**
 * Contrato como tarjeta, para pantallas donde la tabla no cabe (menos de 1024px).
 * Toda la tarjeta es tocable: el enlace del número se estira sobre ella y el menú queda por encima.
 */
export function ContractCard({ contract }) {
  return (
    <li className="relative rounded-lg border bg-background p-4 transition-colors hover:bg-muted/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={ROUTES.contractReview(contract.id)}
            className="font-medium underline-offset-4 after:absolute after:inset-0 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            {contract.contractNumber}
          </Link>
          <p className="mt-0.5 truncate text-sm">{contract.counterpartyName}</p>
          <p className="text-xs text-muted-foreground">{CONTRACT_TYPE[contract.type]}</p>
        </div>
        <div className="relative z-10 -mt-1 -mr-2 shrink-0">
          <ContractRowActions contract={contract} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <ContractStatusBadge status={contract.status} />
        <p className="text-base font-semibold tabular-nums">{formatCurrency(contract.amount, contract.currency)}</p>
      </div>

      <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
        Vigencia: {formatDate(contract.startDate)} — {formatDate(contract.endDate)}
      </p>
    </li>
  )
}
