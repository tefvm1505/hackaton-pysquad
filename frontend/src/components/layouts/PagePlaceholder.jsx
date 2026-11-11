import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from './PageHeader'

/**
 * Vista reservada: existe la ruta y el menú, falta implementar el contenido.
 * `icon` es un componente de lucide-react; `pending` explica qué falta.
 */
export function PagePlaceholder({ title, description, icon: Icon, pending }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <Icon className="size-10 text-muted-foreground" aria-hidden />
          <p className="max-w-md text-sm text-muted-foreground">{pending}</p>
        </CardContent>
      </Card>
    </>
  )
}
