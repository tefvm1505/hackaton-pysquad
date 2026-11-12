import { useCallback, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { ExceptionDetailDialog } from '@/components/exceptions/ExceptionDetailDialog'
import { ExceptionsSummary } from '@/components/exceptions/ExceptionsSummary'
import { ExceptionsTable } from '@/components/exceptions/ExceptionsTable'
import { PageHeader } from '@/components/layouts/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/useAsync'
import { listExceptions } from '@/lib/api'

export default function ExceptionsPage() {
  const { data, error, isLoading, reload } = useAsync(listExceptions, [])
  const [selectedId, setSelectedId] = useState(null)

  // Estable (useCallback): las columnas de la tabla dependen de esta función.
  const open = useCallback((exception) => setSelectedId(exception.id), [])
  const close = useCallback(() => setSelectedId(null), [])

  const selected = data?.find((exception) => exception.id === selectedId) ?? null

  return (
    <>
      <PageHeader
        title="Log de excepciones"
        description="Errores de extracción, validación y causación, con su historial de resolución para auditoría."
        actions={
          <Button variant="outline" onClick={reload} disabled={isLoading}>
            <RefreshCw className={isLoading ? 'animate-spin' : undefined} />
            Actualizar
          </Button>
        }
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudo cargar el log de excepciones</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : !data ? (
        <p role="status" className="py-12 text-center text-sm text-muted-foreground">
          Cargando excepciones…
        </p>
      ) : (
        <>
          <ExceptionsSummary items={data} />
          <ExceptionsTable items={data} onOpen={open} />
          <ExceptionDetailDialog exception={selected} onClose={close} onResolved={reload} />
        </>
      )}
    </>
  )
}
