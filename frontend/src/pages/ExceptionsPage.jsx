import { TriangleAlert } from 'lucide-react'
import { PagePlaceholder } from '@/components/layouts/PagePlaceholder'

export default function ExceptionsPage() {
  return (
    <PagePlaceholder
      title="Log de excepciones"
      description="Errores de extracción, validación y causación para auditoría."
      icon={TriangleAlert}
      pending="Pendiente: tabla de excepciones con filtros por fecha, tipo y severidad. Depende del endpoint de logs del backend."
    />
  )
}
