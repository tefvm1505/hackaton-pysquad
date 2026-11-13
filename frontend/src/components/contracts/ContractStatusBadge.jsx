import { Badge } from '@/components/ui/badge'
import { CONTRACT_STATUS, LIGHT_STYLES } from '@/lib/semaphore'
import { cn } from '@/lib/utils'

/** Estado de la validación manual, con color y texto (el color nunca es lo único que informa). */
export function ContractStatusBadge({ status, className }) {
  const { label, light } = CONTRACT_STATUS[status]
  const styles = LIGHT_STYLES[light]

  return (
    <Badge variant="outline" className={cn('gap-1.5 font-medium', styles.badge, className)}>
      <span aria-hidden className={cn('size-2 rounded-full', styles.dot)} />
      {label}
    </Badge>
  )
}
