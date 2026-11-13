import { useEffect, useState } from 'react'
import { CircleCheck, Info, OctagonX, Sparkles, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceStatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ROUTES } from '@/config/routes'
import { LIGHT_STYLES, SEVERITY, SEVERITY_RANK } from '@/lib/semaphore'
import { cn } from '@/lib/utils'

const SEVERITY_ICON = { error: OctagonX, warning: TriangleAlert, info: CircleCheck }

/** Frases que van rotando mientras el asistente espera un documento. */
const IDLE_PHRASES = [
  'Quiero analizar tu factura',
  'Súbela y te cuento qué encontré',
  'Estoy listo para leerla por ti',
]
const PHRASE_INTERVAL_MS = 3500

/** Qué está haciendo el asistente en cada paso del análisis. */
const STAGE_TEXT = {
  upload: 'Recibiendo tu documento',
  read: 'Leyendo el documento',
  validate: 'Razonando sobre los valores',
  check: 'Buscando duplicados y verificando al proveedor',
}

/**
 * Fase del panel:
 *  - idle:    no hay documento seleccionado -> rectángulo pequeño con animación
 *  - working: el documento se está subiendo o analizando -> "Analizando…"
 *  - result:  ya hay respuesta (o rechazo / error) -> el panel se expande hacia abajo
 */
function phaseOf(item) {
  if (!item) return 'idle'
  return item.status === 'uploading' || item.status === 'analyzing' ? 'working' : 'result'
}

function resultTitle(item) {
  if (item.status === 'done') return 'Listo, esto es lo que encontré'
  if (item.status === 'rejected') return 'No pude recibir este documento'
  return item.analysis ? 'No pude leer este documento' : 'No pude completar el análisis'
}

/* -------------------------------------------------------------------------- */
/* Piezas de la respuesta                                                      */
/* -------------------------------------------------------------------------- */

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
        <Bubble tone="red">
          No pude completar el análisis de <strong className="font-medium break-all">{item.name}</strong>. {item.error}
        </Bubble>
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

function ResultBody({ item }) {
  switch (item.status) {
    case 'rejected':
      return <Rejected item={item} />
    case 'failed':
      return <Failed item={item} />
    default:
      return <Done item={item} />
  }
}

/* -------------------------------------------------------------------------- */
/* Animaciones de la cabecera                                                  */
/* -------------------------------------------------------------------------- */

/** Tres puntos que "respiran": indican que el asistente está pensando. */
function Dots() {
  return (
    <span aria-hidden className="ml-1 inline-flex gap-0.5 align-middle">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1 animate-dot rounded-full bg-current motion-reduce:animate-none"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </span>
  )
}

/** Frase de reposo que cambia sola cada pocos segundos (fija si el sistema pide menos movimiento). */
function useRotatingPhrase(active) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!active || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const id = setInterval(() => setIndex((i) => (i + 1) % IDLE_PHRASES.length), PHRASE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [active])

  return IDLE_PHRASES[index]
}

/**
 * Recuadro del asistente de IA sobre el documento seleccionado.
 *
 * Es compacto mientras no hay respuesta: en reposo muestra una animación que recorre todo el
 * recuadro con una frase invitando a subir una factura; al subir un documento dice "Analizando…".
 * Cuando el backend responde, el recuadro se expande hacia abajo con el resumen, los hallazgos,
 * qué hacer ahora y el acceso a la revisión.
 */
export function AiAssistantPanel({ item, className }) {
  const phase = phaseOf(item)
  const expanded = phase === 'result'
  const phrase = useRotatingPhrase(phase === 'idle')

  // Se recuerda la última respuesta para poder verla mientras el recuadro se contrae.
  const [lastResult, setLastResult] = useState(null)
  if (expanded && lastResult !== item) setLastResult(item)
  const shown = expanded ? item : lastResult

  const stage = item?.stage ?? 'upload'
  const screenReaderText =
    phase === 'idle'
      ? 'Esperando un documento para analizar.'
      : phase === 'working'
        ? `Analizando ${item.name}. ${STAGE_TEXT[stage]}.`
        : `${resultTitle(item)}.`

  return (
    <Card
      role="region"
      aria-label="Respuesta del asistente de IA"
      className={cn('relative isolate gap-0 overflow-hidden', className)}
    >
      {/* Luz animada de fondo: recorre todo el recuadro mientras espera o analiza. */}
      <div
        aria-hidden
        className={cn(
          '-z-10 pointer-events-none absolute inset-0 animate-aurora bg-[length:300%_100%] motion-reduce:animate-none',
          'bg-[linear-gradient(110deg,oklch(0.95_0.04_295),oklch(0.96_0.03_230),oklch(0.96_0.04_345),oklch(0.95_0.04_295))]',
          'transition-opacity duration-700',
          phase === 'working' && '[animation-duration:3.5s]',
          expanded ? 'opacity-0' : 'opacity-100',
        )}
      />

      <p role="status" className="sr-only">
        {screenReaderText}
      </p>

      <CardHeader>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground',
              phase === 'working' && 'animate-pulse motion-reduce:animate-none',
            )}
          >
            <Sparkles aria-hidden className="size-5" />
          </span>

          {/* Altura reservada para 3 líneas: así la cabecera no cambia de tamaño entre reposo,
              análisis y resultado (si no, el recuadro daría un tirón al aparecer el paso actual). */}
          <div className="flex min-h-[3.6rem] min-w-0 flex-col justify-center" aria-hidden>
            <CardTitle>Asistente de Facto</CardTitle>
            <p className="min-h-[1.25rem] text-sm text-muted-foreground">
              {phase === 'idle' && (
                <span key={phrase} className="animate-in fade-in slide-in-from-bottom-1 duration-500">
                  {phrase}
                </span>
              )}
              {phase === 'working' && (
                <span className="font-medium text-foreground">
                  Analizando
                  <Dots />
                </span>
              )}
              {phase === 'result' && resultTitle(item)}
            </p>
            {phase === 'working' && (
              <p key={stage} className="mt-0.5 animate-in fade-in text-xs text-muted-foreground duration-300">
                {STAGE_TEXT[stage]}…
              </p>
            )}
          </div>

          <Badge variant="outline" className="ml-auto shrink-0 bg-background/60">
            IA
          </Badge>
        </div>
      </CardHeader>

      {/* La respuesta se despliega hacia abajo. `grid-rows` anima la altura sin medirla. */}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        {/* `inert`: mientras está cerrada, sus enlaces y botones no reciben foco ni lectores de pantalla. */}
        <div className="min-h-0 overflow-hidden" inert={!expanded}>
          <CardContent
            className={cn(
              'space-y-5 pt-4 transition-opacity duration-500 motion-reduce:transition-none',
              expanded ? 'opacity-100 delay-150' : 'opacity-0',
            )}
          >
            {shown && (
              <div key={shown.id} className="animate-in fade-in space-y-5 duration-300">
                <ResultBody item={shown} />
              </div>
            )}
            <p className="flex gap-2 border-t pt-4 text-xs text-muted-foreground">
              <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              La IA puede equivocarse. Verifica los datos en la pantalla de revisión antes de aprobar.
            </p>
          </CardContent>
        </div>
      </div>
    </Card>
  )
}
