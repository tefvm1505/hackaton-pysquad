import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ContractStatusBadge } from '@/components/contracts/ContractStatusBadge'
import { PageHeader } from '@/components/layouts/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ROUTES } from '@/config/routes'
import { useAsync } from '@/hooks/useAsync'
import { getContract } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/format'
import { BILLING_FREQUENCY } from '@/lib/semaphore'

function BackLink() {
  return (
    <Link
      to={ROUTES.contracts}
      className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft aria-hidden className="size-4" />
      Volver a contratos
    </Link>
  )
}

/** Campo de solo lectura con etiqueta. */
function DataField({ label, value, className }) {
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value || <span className="text-muted-foreground">—</span>}</p>
    </div>
  )
}

/** Carga el contrato de la URL y muestra sus datos. */
export default function ContractReviewPage() {
  const { contractId = '' } = useParams()
  const { data: contract, error, isLoading } = useAsync(() => getContract(contractId), [contractId])

  if (isLoading) {
    return (
      <p role="status" className="py-12 text-center text-sm text-muted-foreground">
        Cargando contrato…
      </p>
    )
  }

  if (error || !contract) {
    return (
      <>
        <BackLink />
        <Alert variant="destructive">
          <AlertTitle>{error ? 'No se pudo cargar el contrato' : 'Contrato no encontrado'}</AlertTitle>
          <AlertDescription>
            {error?.message ?? 'Puede que haya sido eliminado o que el enlace sea incorrecto.'}
          </AlertDescription>
        </Alert>
      </>
    )
  }

  return (
    <>
      <BackLink />
      <PageHeader
        title={`Contrato ${contract.contractNumber}`}
        description={`${contract.counterpartyName} · NIT ${contract.counterpartyNit}`}
        actions={<ContractStatusBadge status={contract.status} />}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Información general */}
        <Card>
          <CardHeader>
            <CardTitle>Información general</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <DataField label="ID Contrato" value={contract.contractNumber} />
              <DataField label="Centro de costo" value={contract.costCenter} />
              <DataField label="Contraparte" value={contract.counterpartyName} className="sm:col-span-2" />
              <DataField label="NIT Contraparte" value={contract.counterpartyNit} />
              <DataField label="Frecuencia" value={BILLING_FREQUENCY[contract.billingFrequency] ?? contract.billingFrequency} />
              <DataField label="Objeto" value={contract.object} className="sm:col-span-2" />
            </div>
          </CardContent>
        </Card>

        {/* Montos y vigencia */}
        <Card>
          <CardHeader>
            <CardTitle>Montos y vigencia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <DataField label="Fecha de inicio" value={contract.startDate ? formatDate(contract.startDate) : null} />
              <DataField label="Fecha de fin" value={contract.endDate ? formatDate(contract.endDate) : null} />

              <div className="sm:col-span-2 mt-2 rounded-lg bg-muted/50 p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Valor total</p>
                    <p className="mt-0.5 text-base font-bold tabular-nums">
                      {formatCurrency(contract.amount, contract.currency)}
                    </p>
                  </div>
                  {contract.periodAmount != null && (
                    <div>
                      <p className="text-xs text-muted-foreground">Valor por periodo</p>
                      <p className="mt-0.5 text-sm font-semibold tabular-nums">
                        {formatCurrency(contract.periodAmount, contract.currency)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
