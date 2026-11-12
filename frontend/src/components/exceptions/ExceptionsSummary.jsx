import { CircleCheck, FolderOpen, OctagonX, TriangleAlert } from 'lucide-react'
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

/** Resumen de arriba: lo que sigue pendiente y lo ya resuelto. */
export function ExceptionsSummary({ items }) {
  const open = items.filter((e) => e.status === 'open')

  return (
    <section aria-label="Resumen de excepciones" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Abiertas" value={open.length} icon={FolderOpen} />
      <Stat label="Errores abiertos" value={open.filter((e) => e.severity === 'error').length} icon={OctagonX} tone="red" />
      <Stat
        label="Advertencias abiertas"
        value={open.filter((e) => e.severity === 'warning').length}
        icon={TriangleAlert}
        tone="yellow"
      />
      <Stat label="Resueltas" value={items.length - open.length} icon={CircleCheck} tone="green" />
    </section>
  )
}
