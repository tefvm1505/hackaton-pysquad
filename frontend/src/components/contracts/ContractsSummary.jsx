import { BadgeCheck, ClipboardCheck, FileSignature, MessageSquareWarning } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { LIGHT_STYLES } from '@/lib/semaphore'
import { cn } from '@/lib/utils'

function Stat({ label, value, icon: Icon, tone }) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3">
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl',
            tone ? cn('border', LIGHT_STYLES[tone].panel) : 'bg-muted',
          )}
        >
          <Icon aria-hidden className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-2xl leading-none font-semibold tabular-nums">{value}</p>
          <p className="mt-1 text-xs leading-tight text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

/** Cuántos contratos hay en cada estado de la validación manual. */
export function ContractsSummary({ items }) {
  const count = (status) => items.filter((c) => c.status === status).length

  return (
    <section aria-label="Resumen de contratos" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Contratos" value={items.length} icon={FileSignature} />
      <Stat label="Pendientes de revisión" value={count('pending_review')} icon={ClipboardCheck} tone="yellow" />
      <Stat label="Con observaciones" value={count('observed')} icon={MessageSquareWarning} tone="red" />
      <Stat label="Validados" value={count('validated')} icon={BadgeCheck} tone="green" />
    </section>
  )
}
