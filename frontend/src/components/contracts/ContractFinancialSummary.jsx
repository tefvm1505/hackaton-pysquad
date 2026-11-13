import { Progress } from '@/components/ui/progress'
import { executedPercent, ivaAmount, remainingAmount, totalWithIva } from '@/lib/contracts'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

function Row({ label, value, strong, tone }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
      <dt className={cn('text-muted-foreground', strong && 'font-medium text-foreground')}>{label}</dt>
      <dd className={cn('tabular-nums', strong && 'font-semibold', tone === 'danger' && 'font-medium text-danger')}>
        {value}
      </dd>
    </div>
  )
}

/**
 * Cuentas del contrato. Se recalculan con el valor y el IVA que la persona tiene escritos en el
 * formulario, para que al corregir un monto vea de inmediato el IVA, el total y cuánto queda por ejecutar.
 * Lo facturado a la fecha no se edita: lo trae contabilidad.
 *
 * Props: `contract` (el registrado), `amount` / `ivaRate` / `currency` (lo que hay en el formulario).
 */
export function ContractFinancialSummary({ contract, amount, ivaRate, currency }) {
  // Mientras el campo está vacío o inválido (NaN) se usa el valor registrado.
  const live = {
    ...contract,
    amount: Number.isFinite(amount) && amount > 0 ? amount : contract.amount,
    ivaRate: Number.isFinite(ivaRate) ? ivaRate : contract.ivaRate,
  }
  const money = (value) => formatCurrency(value, currency || contract.currency)
  const percent = executedPercent(live)
  const remaining = remainingAmount(live)
  const over = remaining < 0

  return (
    <div className="rounded-lg border bg-muted/30 p-4" aria-live="polite">
      <h3 className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Resumen calculado
      </h3>
      <dl className="divide-y">
        <Row label="Valor del contrato" value={money(live.amount)} />
        <Row label={`IVA (${live.ivaRate}%)`} value={money(ivaAmount(live))} />
        <Row label="Total con IVA" value={money(totalWithIva(live))} strong />
        <Row label="Facturado a la fecha" value={money(live.billedToDate)} />
        <Row
          label={over ? 'Facturado de más' : 'Saldo por ejecutar'}
          value={money(Math.abs(remaining))}
          tone={over ? 'danger' : undefined}
        />
      </dl>

      <div className="mt-3">
        <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
          <span>Ejecución</span>
          <span className={cn('font-medium tabular-nums', over && 'text-danger')}>
            {new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(percent)}%
          </span>
        </div>
        <Progress
          value={percent}
          aria-label="Porcentaje ejecutado del contrato"
          indicatorClassName={over ? 'bg-danger' : percent >= 90 ? 'bg-warning' : undefined}
        />
      </div>
    </div>
  )
}
