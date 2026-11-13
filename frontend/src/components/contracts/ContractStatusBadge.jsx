import { Badge } from '@/components/ui/badge'
import { LIGHT_STYLES } from '@/lib/semaphore'
import { cn } from '@/lib/utils'

const STATUS_MAP = {
  activo: { label: 'Activo', light: 'green' },
  inactivo: { label: 'Inactivo', light: 'red' },
  pendiente: { label: 'Pendiente', light: 'yellow' },
  observado: { label: 'Observado', light: 'red' },
  validado: { label: 'Validado', light: 'green' },
  finalizado: { label: 'Finalizado', light: 'yellow' },
}

/** Estado del contrato según la base de datos */
export function ContractStatusBadge({ status, className }) {
  const key = (status || '').toLowerCase().trim()
  const info = STATUS_MAP[key]
  const label = info ? info.label : (status ? (status.charAt(0).toUpperCase() + status.slice(1)) : 'Sin estado')
  const light = info ? info.light : 'green'
  const styles = LIGHT_STYLES[light] || LIGHT_STYLES.green

  return (
    <Badge variant="outline" className={cn('gap-1.5 font-medium', styles.badge, className)}>
      <span aria-hidden className={cn('size-2 rounded-full', styles.dot)} />
      {label}
    </Badge>
  )
}
