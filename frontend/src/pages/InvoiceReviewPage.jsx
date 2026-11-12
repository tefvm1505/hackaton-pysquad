import { useState } from 'react'
import { ArrowLeft, Check, FileText, X } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceStatusBadge'
import { PageHeader } from '@/components/layouts/PageHeader'
import { ConfirmApproveDialog } from '@/components/review/ConfirmApproveDialog'
import { ExtractedDataForm } from '@/components/review/ExtractedDataForm'
import { InvoiceLinesTable } from '@/components/review/InvoiceLinesTable'
import { RejectDialog } from '@/components/review/RejectDialog'
import { ValidationFindings } from '@/components/review/ValidationFindings'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ROUTES } from '@/config/routes'
import { useAsync } from '@/hooks/useAsync'
import { approveInvoice, getInvoice, rejectInvoice } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { INVOICE_STATUS, REVIEWABLE_STATUSES } from '@/lib/semaphore'

const FORM_ID = 'invoice-review-form'

function BackLink() {
  return (
    <Link
      to={ROUTES.invoices}
      className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft aria-hidden className="size-4" />
      Volver a facturas
    </Link>
  )
}

/** Carga la factura de la URL y delega la pantalla a `ReviewContent`. */
export default function InvoiceReviewPage() {
  const { invoiceId = '' } = useParams()
  const { data: invoice, error, isLoading } = useAsync(() => getInvoice(invoiceId), [invoiceId])

  if (isLoading) {
    return (
      <p role="status" className="py-12 text-center text-sm text-muted-foreground">
        Cargando factura…
      </p>
    )
  }

  if (error || !invoice) {
    return (
      <>
        <BackLink />
        <Alert variant="destructive">
          <AlertTitle>{error ? 'No se pudo cargar la factura' : 'Factura no encontrada'}</AlertTitle>
          <AlertDescription>
            {error?.message ?? 'Puede que haya sido eliminada o que el enlace sea incorrecto.'}
          </AlertDescription>
        </Alert>
      </>
    )
  }

  // `key` reinicia el formulario si se navega entre facturas sin desmontar la página.
  return <ReviewContent key={invoice.id} invoice={invoice} />
}

function ReviewContent({ invoice }) {
  const navigate = useNavigate()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [pendingApproval, setPendingApproval] = useState(null)
  const [isApproving, setIsApproving] = useState(false)

  const canReview = REVIEWABLE_STATUSES.has(invoice.status)
  const errorCount = invoice.findings.filter((f) => f.severity === 'error').length
  const attentionCount = invoice.findings.filter((f) => f.severity !== 'info').length

  async function approve(values) {
    setIsApproving(true)
    try {
      await approveInvoice(invoice.id, values)
      toast.success('Factura aprobada', {
        description: `${values.invoiceNumber} quedó lista para causación.`,
      })
      navigate(ROUTES.invoices)
    } catch (error) {
      toast.error('No se pudo aprobar la factura', {
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
      })
    } finally {
      setIsApproving(false)
      setPendingApproval(null)
    }
  }

  function handleValid(values) {
    // Con errores críticos pedimos una segunda confirmación explícita.
    if (errorCount > 0) {
      setPendingApproval(values)
      return
    }
    void approve(values)
  }

  function handleInvalid() {
    toast.error('Hay campos con errores', {
      description: 'Corrígelos antes de aprobar la factura.',
    })
  }

  async function reject(reason) {
    try {
      await rejectInvoice(invoice.id, reason)
    } catch (error) {
      toast.error('No se pudo rechazar la factura', {
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
      })
      throw error
    }
    toast.success('Factura rechazada', {
      description: `${invoice.invoiceNumber} se marcó como rechazada.`,
    })
    setRejectOpen(false)
    navigate(ROUTES.invoices)
  }

  return (
    <>
      <BackLink />
      <PageHeader
        title={`Factura ${invoice.invoiceNumber}`}
        description={`${invoice.supplierName} · Recibida el ${formatDate(invoice.receivedAt)}`}
        actions={
          <>
            <InvoiceStatusBadge status={invoice.status} />
            {canReview && (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setRejectOpen(true)}
                  disabled={isApproving}
                >
                  <X />
                  Rechazar
                </Button>
                {/* Fuera del <form>: se vincula con el atributo `form`. */}
                <Button type="submit" form={FORM_ID} disabled={isApproving}>
                  <Check />
                  {isApproving ? 'Aprobando…' : 'Aprobar'}
                </Button>
              </>
            )}
          </>
        }
      />

      {!canReview && (
        <Alert className="mb-6">
          <AlertTitle>Factura {INVOICE_STATUS[invoice.status].label.toLowerCase()}</AlertTitle>
          <AlertDescription>
            {invoice.rejectionReason
              ? `Motivo: ${invoice.rejectionReason}`
              : 'Ya no admite cambios desde esta pantalla.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Dos columnas solo cuando caben (1280px+; con el menú lateral a 1024px quedarían muy angostas). */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Datos extraídos</CardTitle>
          </CardHeader>
          <CardContent>
            <ExtractedDataForm
              formId={FORM_ID}
              invoice={invoice}
              readOnly={!canReview}
              onValid={handleValid}
              onInvalid={handleInvalid}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Tabs defaultValue="findings">
              <TabsList>
                <TabsTrigger value="findings">
                  Hallazgos
                  {attentionCount > 0 && (
                    <span className="rounded-full bg-background px-1.5 text-xs tabular-nums">
                      {attentionCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="lines">Líneas</TabsTrigger>
                <TabsTrigger value="document">Documento</TabsTrigger>
              </TabsList>

              <TabsContent value="findings" className="mt-4">
                <ValidationFindings findings={invoice.findings} />
              </TabsContent>

              <TabsContent value="lines" className="mt-4">
                <InvoiceLinesTable invoice={invoice} />
              </TabsContent>

              <TabsContent value="document" className="mt-4">
                <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
                  <FileText aria-hidden className="size-10 text-muted-foreground" />
                  <p className="max-w-xs text-sm text-muted-foreground">
                    Aquí se mostrará el PDF original de la factura. Falta la URL del documento
                    en la respuesta del backend.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <RejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        invoiceNumber={invoice.invoiceNumber}
        onConfirm={reject}
      />

      <ConfirmApproveDialog
        open={pendingApproval !== null}
        onOpenChange={(open) => !open && setPendingApproval(null)}
        errorCount={errorCount}
        isSubmitting={isApproving}
        onConfirm={() => pendingApproval && void approve(pendingApproval)}
      />
    </>
  )
}
