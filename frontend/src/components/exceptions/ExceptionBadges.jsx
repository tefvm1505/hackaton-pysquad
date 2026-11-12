import { Circle, CircleCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { EXCEPTION_STATUS, LIGHT_STYLES, SEVERITY } from '@/lib/semaphore'
import { cn } from '@/lib/utils'

/** Severidad con punto de color + texto (el color nunca es lo único que informa). */
export function SeverityBadge({ severity, className }) {
  const { label, light } = SEVERITY[severity]
  const styles = LIGHT_STYLES[light]

  return (
    <Badge variant="outline" className={cn('gap-1.5 font-medium', styles.badge, className)}>
      <span aria-hidden className={cn('size-2 rounded-full', styles.dot)} />
      {label}
    </Badge>
  )
}

export function ExceptionStatusBadge({ status, className }) {
  const resolved = status === 'resolved'
  const Icon = resolved ? CircleCheck : Circle

  return (
    <Badge
      variant="outline"
      className={cn('gap-1.5 font-medium', resolved ? LIGHT_STYLES.green.badge : 'text-foreground', className)}
    >
      <Icon aria-hidden className="size-3.5" />
      {EXCEPTION_STATUS[status]}
    </Badge>
  )
}

/** Severidad + estado, juntos. Se repite en tarjetas y en el detalle. */
export function ExceptionBadgeGroup({ exception }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SeverityBadge severity={exception.severity} />
      <ExceptionStatusBadge status={exception.status} />
    </div>
  )
}
