import { CircleCheck, FileUp, OctagonX, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceStatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ROUTES } from '@/config/routes'
import { LIGHT_STYLES, SEVERITY, SEVERITY_RANK } from '@/lib/semaphore'
import { cn } from '@/lib/utils'
import { ProcessingSteps } from './ProcessingSteps'

const SEVERITY_ICON = { error: OctagonX, warning: TriangleAlert, info: CircleCheck }

/** Globo de conversación: así se distingue lo que "dice" el asistente. */
function Bubble({ children, tone = 'neutral' }) {
  return (
    <div
      className={cn(
        'rounded-2xl rounded-tl-sm p-4 text-sm leading-relaxed',
        tone === 'neutral' && 'bg-muted/60',
        tone === 'red' && cn('border', LIGHT_STYLES.red.panel),
      )}
    >
      {children}
    </div>
  )
}

function SectionTitle({ children }) {
  return <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{children}</h3>
}

function Recommendations({ items }) {
  if (!items?.length) return null
  return (
    <div>
      <SectionTitle>Qué te recomiendo hacer</SectionTitle>
      <ol className="space-y-2.5">
        {items.map((item, index) => (
          <li key={item.id} className="flex gap-3 text-sm">
            <span
              aria-hidden
              className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground"
            >
              {index + 1}
            </span>
            <span className="leading-relaxed">{item.text}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** Hallazgos importantes de la factura (los informativos no se muestran aquí). */
function Findings({ findings }) {
  const relevant = [...findings]
    .filter((f) => f.severity !== 'info')
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
  if (relevant.length === 0) return null

  const visible = relevant.slice(0, 3)
  const extra = relevant.length - visible.length

  return (
    <div>
      <SectionTitle>Qué encontré</SectionTitle>
      <ul className="space-y-2">
        {visible.map((finding) => {
          const { label, light } = SEVERITY[finding.severity]
          const Icon = SEVERITY_ICON[finding.severity]
          return (
            <li key={finding.id} className={cn('flex gap-2.5 rounded-lg border p-2.5 text-sm', LIGHT_STYLES[light].panel)}>
              <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-0">
                <p className="font-medium">
                  <span className="sr-only">{label}: </span>
                  {finding.title}
                </p>
                {finding.expected !== undefined && (
                  <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                    Esperado {finding.expected} · Encontrado {finding.found ?? '—'}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      {extra > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          y {extra} {extra === 1 ? 'hallazgo más' : 'hallazgos más'} en la pantalla de revisión.
        </p>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Contenido según el estado del documento seleccionado                        */
/* -------------------------------------------------------------------------- */

function Intro() {
  return (
    <div className="space-y-5">
      <Bubble>
        Hola, soy el asistente de Facto. Cuando subas una factura, la leeré, la validaré y te
        explicaré aquí qué encontré y qué te conviene hacer.
      </Bubble>
      <div>
        <SectionTitle>Qué voy a revisar</SectionTitle>
        <ul className="space-y-2.5 text-sm">
          {[
            'Que los datos se lean bien (número, NIT, fechas y valores).',
            'Que coincida con la orden de compra y el IVA esté bien calculado.',
            'Que no sea un duplicado y que el proveedor esté registrado.',
          ].map((text) => (
            <li key={text} className="flex gap-2.5">
              <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Working({ item }) {
  return (
    <div className="space-y-5">
      <Bubble>
        Estoy analizando <strong className="font-medium break-all">{item.name}</strong>. Tarda unos segundos.
      </Bubble>
      <ProcessingSteps currentStage={item.stage ?? 'upload'} />
    </div>
  )
}

function Rejected({ item }) {
  return (
    <div className="space-y-5">
      <Bubble tone="red">
        No pude recibir <strong className="font-medium break-all">{item.name}</strong>. {item.error}
      </Bubble>
      <Recommendations
        items={[
          { id: 'r1', text: 'Sube la factura original en PDF o el XML (UBL) que envía el proveedor.' },
          { id: 'r2', text: 'Cada archivo puede pesar hasta 10 MB y debe ser un documento válido.' },
        ]}
      />
    </div>
  )
}

function Failed({ item }) {
  // Sin análisis: falló la conexión o el servidor, no es culpa del documento.
  if (!item.analysis) {
    return (
      <div className="space-y-5">
        <Bubble tone="red">No pude completar el análisis de <strong className="font-medium break-all">{item.name}</strong>. {item.error}</Bubble>
        <Recommendations items={[{ id: 'r1', text: 'Espera un momento y vuelve a subir el documento.' }]} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Bubble tone="red">{item.analysis.summary}</Bubble>
      <Recommendations items={item.analysis.recommendations} />
      <Button asChild variant="outline" className="w-full">
        <Link to={ROUTES.exceptions}>Ver en el log de excepciones</Link>
      </Button>
    </div>
  )
}

function Done({ item }) {
  const { invoice, analysis } = item
  const needsAttention = analysis.outcome !== 'validated'

  return (
    <div className="space-y-5">
      <Bubble>{analysis.summary}</Bubble>

      <div className="flex flex-wrap items-center gap-2">
        <InvoiceStatusBadge status={invoice.status} />
        <span className="text-sm text-muted-foreground">
          {invoice.invoiceNumber} · {invoice.supplierName}
        </span>
      </div>

      <Findings findings={invoice.findings} />
      <Recommendations items={analysis.recommendations} />

      <div className="flex flex-wrap gap-2">
        <Button asChild className="flex-1">
          <Link to={ROUTES.invoiceReview(invoice.id)}>Revisar factura</Link>
        </Button>
        {needsAttention && (
          <Button asChild variant="outline" className="flex-1">
            <Link to={ROUTES.exceptions}>Ver excepciones</Link>
          </Button>
        )}
      </div>
    </div>
  )
}

function PanelBody({ item }) {
  if (!item) return <Intro />
  switch (item.status) {
    case 'uploading':
    case 'analyzing':
      return <Working item={item} />
    case 'rejected':
      return <Rejected item={item} />
    case 'failed':
      return <Failed item={item} />
    case 'done':
      return <Done item={item} />
    default:
      return <Intro />
  }
}

/**
 * Recuadro con la respuesta de la IA sobre el documento seleccionado:
 * resumen, hallazgos, qué hacer ahora, y acceso directo a la revisión.
 */
export function AiAssistantPanel({ item, className }) {
  return (
    <Card role="region" aria-label="Respuesta del asistente de IA" className={className}>
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles aria-hidden className="size-5" />
          </span>
          <div className="min-w-0">
            <CardTitle>Asistente de Facto</CardTitle>
            <p className="text-xs text-muted-foreground">Te explica qué pasó con cada documento</p>
          </div>
          <Badge variant="outline" className="ml-auto shrink-0">
            IA
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-1" aria-live="polite">
        <PanelBody item={item} />
        <p className="flex gap-2 border-t pt-4 text-xs text-muted-foreground">
          <FileUp aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          La IA puede equivocarse. Verifica los datos en la pantalla de revisión antes de aprobar.
        </p>
      </CardContent>
    </Card>
  )
}
