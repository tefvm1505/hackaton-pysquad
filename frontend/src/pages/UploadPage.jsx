import { FileUp } from 'lucide-react'
import { PagePlaceholder } from '@/components/layouts/PagePlaceholder'

export default function UploadPage() {
  return (
    <PagePlaceholder
      title="Carga de documentos"
      description="Recibe facturas en PDF o XML (UBL) para procesarlas."
      icon={FileUp}
      pending="Pendiente: zona de arrastrar y soltar, validación de tipo y tamaño, y progreso de subida. Depende del endpoint de carga del backend."
    />
  )
}
