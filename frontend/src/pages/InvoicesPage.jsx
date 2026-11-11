import { RefreshCw } from 'lucide-react'
import { InvoicesTable } from '@/components/invoices/InvoicesTable'
import { PageHeader } from '@/components/layouts/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/useAsync'
import { listInvoices } from '@/lib/api'

export default function InvoicesPage() {
  const { data, error, isLoading, reload } = useAsync(listInvoices, [])

  return (
    <>
      <PageHeader
        title="Facturas"
        description="Facturas recibidas y su estado de validación."
        actions={
          <Button variant="outline" onClick={reload} disabled={isLoading}>
            <RefreshCw className={isLoading ? 'animate-spin' : undefined} />
            Actualizar
          </Button>
        }
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudieron cargar las facturas</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : !data ? (
        <p role="status" className="py-12 text-center text-sm text-muted-foreground">
          Cargando facturas…
        </p>
      ) : (
        <InvoicesTable invoices={data} />
      )}
    </>
  )
}
