import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { CausacionesPanel } from '@/components/review/CausacionesPanel'
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceStatusBadge'
import { PageHeader } from '@/components/layouts/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ROUTES } from '@/config/routes'
import { useAsync } from '@/hooks/useAsync'
import { getInvoice } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/format'

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

/** Campo de solo lectura con etiqueta. */
function DataField({ label, value, className }) {
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value || <span className="text-muted-foreground">—</span>}</p>
    </div>
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

  return <ReviewContent key={invoice.id} invoice={invoice} />
}

function ReviewContent({ invoice }) {
  const causacionesCount = invoice.causaciones?.length ?? 0

  return (
    <>
      <BackLink />
      <PageHeader
        title={`Factura ${invoice.invoiceNumber}`}
        description={`${invoice.supplierName} · NIT ${invoice.supplierNit}`}
        actions={<InvoiceStatusBadge status={invoice.status} />}
      />

      {/* Dos columnas en pantallas grandes */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Columna izquierda: datos de la factura */}
        <Card>
          <CardHeader>
            <CardTitle>Datos de la factura</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <DataField label="Número de factura" value={invoice.invoiceNumber} />
              <DataField label="Orden de compra" value={invoice.purchaseOrderNumber} />
              <DataField label="Proveedor" value={invoice.supplierName} className="sm:col-span-2" />
              <DataField label="NIT Proveedor" value={invoice.supplierNit} />
              <DataField label="Moneda" value={invoice.currency} />
              <DataField label="Fecha de emisión" value={invoice.issueDate ? formatDate(invoice.issueDate) : null} />
              <DataField label="Fecha de vencimiento" value={invoice.dueDate ? formatDate(invoice.dueDate) : null} />
              <DataField label="Cliente" value={invoice.clientName} />
              <DataField label="NIT Cliente" value={invoice.clientNit} />
              <DataField label="Contrato" value={invoice.contractId} />
              <DataField label="CUFE" value={invoice.id} className="sm:col-span-2" />

              <div className="sm:col-span-2 mt-2 rounded-lg bg-muted/50 p-3">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Subtotal</p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums">
                      {formatCurrency(invoice.subtotal, invoice.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">IVA</p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums">
                      {formatCurrency(invoice.tax, invoice.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="mt-0.5 text-base font-bold tabular-nums">
                      {formatCurrency(invoice.total, invoice.currency)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Columna derecha: causaciones */}
        <Card>
          <CardContent>
            <Tabs defaultValue="causaciones">
              <TabsList>
                <TabsTrigger value="causaciones">
                  Causaciones
                  {causacionesCount > 0 && (
                    <span className="rounded-full bg-background px-1.5 text-xs tabular-nums">
                      {causacionesCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="causaciones" className="mt-4">
                <CausacionesPanel causaciones={invoice.causaciones} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
