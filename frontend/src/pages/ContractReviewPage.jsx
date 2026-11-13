import { useState } from 'react'
import { ArrowLeft, BadgeCheck, CircleAlert, Info, MessageSquareWarning, TriangleAlert } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ContractForm } from '@/components/contracts/ContractForm'
import { ContractStatusBadge } from '@/components/contracts/ContractStatusBadge'
import { ObserveDialog } from '@/components/contracts/ObserveDialog'
import { PageHeader } from '@/components/layouts/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/config/routes'
import { useAsync } from '@/hooks/useAsync'
import { getContract, observeContract, validateContract } from '@/lib/api'
import { CONTRACT_FIELD_LABELS, getContractAlerts } from '@/lib/contracts'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { CONTRACT_TYPE, LIGHT_STYLES, REVIEWABLE_CONTRACT_STATUSES, SEVERITY } from '@/lib/semaphore'
import { cn } from '@/lib/utils'

const FORM_ID = 'contract-review-form'
const ALERT_ICON = { error: CircleAlert, warning: TriangleAlert, info: Info }

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

/** Carga el contrato de la URL y delega la pantalla a `ReviewContent`. */
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

  // `key` reinicia el formulario si se navega entre contratos sin desmontar la página.
  return <ReviewContent key={contract.id} contract={contract} />
}

/** Puntos que conviene mirar mientras se revisa (facturó de más, vence pronto, IVA 0%…). */
function AttentionPoints({ contract }) {
  const money = (value) => formatCurrency(value, contract.currency)
  const alerts = getContractAlerts(contract, money)
  if (alerts.length === 0) return null

  return (
    <section aria-label="Puntos de atención" className="mb-6 space-y-2">
      {alerts.map((alert) => {
        const { label, light } = SEVERITY[alert.severity]
        const Icon = ALERT_ICON[alert.severity]
        return (
          <div key={alert.id} className={cn('flex gap-2.5 rounded-lg border p-3 text-sm', LIGHT_STYLES[light].panel)}>
            <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
            <p>
              <span className="sr-only">{label}: </span>
              {alert.text}
            </p>
          </div>
        )
      })}
    </section>
  )
}

/** Quién validó u observó el contrato, cuándo y qué corrigió. */
function ReviewHistory({ contract }) {
  const { validation, observation } = contract
  if (!validation && !observation) return null

  return (
    <section aria-label="Historial de revisión" className="mb-6 space-y-3">
      {validation && (
        <Alert>
          <BadgeCheck aria-hidden />
          <AlertTitle>Validado por {validation.by}</AlertTitle>
          <AlertDescription>
            <span className="block">{formatDateTime(validation.at)}</span>
            <span className="block">
              {validation.corrections.length === 0
                ? 'Se confirmó sin cambios.'
                : `Se corrigió: ${validation.corrections.map((key) => CONTRACT_FIELD_LABELS[key] ?? key).join(', ')}.`}
            </span>
          </AlertDescription>
        </Alert>
      )}
      {observation && contract.status === 'observed' && (
        <Alert variant="destructive">
          <MessageSquareWarning aria-hidden />
          <AlertTitle>Observado por {observation.by}</AlertTitle>
          <AlertDescription>
            <span className="block">{formatDateTime(observation.at)}</span>
            <span className="block">{observation.note}</span>
          </AlertDescription>
        </Alert>
      )}
    </section>
  )
}

function ReviewContent({ contract }) {
  const navigate = useNavigate()
  const [observeOpen, setObserveOpen] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const canReview = REVIEWABLE_CONTRACT_STATUSES.has(contract.status)

  async function validate(values) {
    setIsValidating(true)
    try {
      await validateContract(contract.id, values)
      toast.success('Contrato validado', {
        description: `${values.contractNumber} quedó validado: detalles, montos y tipo revisados.`,
      })
      navigate(ROUTES.contracts)
    } catch (error) {
      toast.error('No se pudo validar el contrato', {
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
      })
    } finally {
      setIsValidating(false)
    }
  }

  function handleInvalid() {
    // `id` fijo: pulsar varias veces actualiza el mismo aviso en vez de apilar uno nuevo.
    toast.error('Falta completar la revisión', {
      id: 'contract-review-incomplete',
      description: 'Corrige los campos marcados y confirma las tres revisiones.',
    })
  }

  async function observe(note) {
    try {
      await observeContract(contract.id, note)
    } catch (error) {
      toast.error('No se pudo guardar la observación', {
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
      })
      throw error
    }
    toast.success('Observaciones registradas', {
      description: `${contract.contractNumber} quedó con observaciones.`,
    })
    setObserveOpen(false)
    navigate(ROUTES.contracts)
  }

  return (
    <>
      <BackLink />
      <PageHeader
        title={`Contrato ${contract.contractNumber}`}
        description={`${contract.counterpartyName} · ${CONTRACT_TYPE[contract.type]}`}
        actions={
          <>
            <ContractStatusBadge status={contract.status} />
            {canReview && (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setObserveOpen(true)}
                  disabled={isValidating}
                >
                  <MessageSquareWarning />
                  Dejar observaciones
                </Button>
                {/* Fuera del <form>: se vincula con el atributo `form`. */}
                <Button type="submit" form={FORM_ID} disabled={isValidating}>
                  <BadgeCheck />
                  {isValidating ? 'Validando…' : 'Validar contrato'}
                </Button>
              </>
            )}
          </>
        }
      />

      <ReviewHistory contract={contract} />
      <AttentionPoints contract={contract} />

      <ContractForm
        formId={FORM_ID}
        contract={contract}
        readOnly={!canReview}
        onValid={validate}
        onInvalid={handleInvalid}
      />

      <ObserveDialog
        open={observeOpen}
        onOpenChange={setObserveOpen}
        contractNumber={contract.contractNumber}
        onConfirm={observe}
      />
    </>
  )
}
