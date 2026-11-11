import { Badge } from '@/components/ui/badge'
import { INVOICE_STATUS, LIGHT_STYLES } from '@/lib/semaphore'
import { cn } from '@/lib/utils'

/**
 * Semáforo de estado. Además del color incluye texto, para que el estado
 * no dependa solo del color (accesibilidad, daltonismo).
 */
export function InvoiceStatusBadge({ status, className }) {
  const { label, light } = INVOICE_STATUS[status]
  const styles = LIGHT_STYLES[light]

  return (
    <Badge variant="outline" className={cn('gap-1.5 font-medium', styles.badge, className)}>
      <span aria-hidden className={cn('size-2 rounded-full', styles.dot)} />
      {label}
    </Badge>
  )
}
