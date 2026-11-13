import { useMemo } from 'react'
import { BadgeCheck, FileSignature } from 'lucide-react'
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

/** Resumen de contratos según los estados reales en la base de datos. */
export function ContractsSummary({ items }) {
  const statusCounts = useMemo(() => {
    const counts = {}
    for (const c of items) {
      const st = c.status || 'Sin estado'
      counts[st] = (counts[st] || 0) + 1
    }
    return counts
  }, [items])

  return (
    <section aria-label="Resumen de contratos" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Total contratos" value={items.length} icon={FileSignature} />
      {Object.entries(statusCounts).map(([statusKey, val]) => {
        const normalized = statusKey.toLowerCase()
        const tone = normalized === 'activo' ? 'green' : normalized === 'inactivo' ? 'red' : 'yellow'
        const label = statusKey.charAt(0).toUpperCase() + statusKey.slice(1)
        return (
          <Stat
            key={statusKey}
            label={label}
            value={val}
            icon={BadgeCheck}
            tone={tone}
          />
        )
      })}
    </section>
  )
}
