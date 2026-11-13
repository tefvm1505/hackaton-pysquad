import { RefreshCw } from 'lucide-react'
import { ContractsSummary } from '@/components/contracts/ContractsSummary'
import { ContractsTable } from '@/components/contracts/ContractsTable'
import { PageHeader } from '@/components/layouts/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/useAsync'
import { listContracts } from '@/lib/api'

export default function ContractsPage() {
  const { data, error, isLoading, reload } = useAsync(listContracts, [])

  return (
    <>
      <PageHeader
        title="Contratos"
        description="Consulta los contratos y valida a mano sus detalles, montos y tipo."
        actions={
          <Button variant="outline" onClick={reload} disabled={isLoading}>
            <RefreshCw className={isLoading ? 'animate-spin' : undefined} />
            Actualizar
          </Button>
        }
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudieron cargar los contratos</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : !data ? (
        <p role="status" className="py-12 text-center text-sm text-muted-foreground">
          Cargando contratos…
        </p>
      ) : (
        <>
          <ContractsSummary items={data} />
          <ContractsTable contracts={data} />
        </>
      )}
    </>
  )
}
