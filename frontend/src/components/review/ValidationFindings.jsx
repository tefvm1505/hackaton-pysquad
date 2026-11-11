import { CircleCheck, OctagonX, TriangleAlert } from 'lucide-react'
import { FINDING_CATEGORY_LABELS, LIGHT_STYLES, SEVERITY } from '@/lib/semaphore'
import { cn } from '@/lib/utils'

const SEVERITY_ICON = {
  error: OctagonX,
  warning: TriangleAlert,
  info: CircleCheck,
}

/** Errores primero, luego advertencias, luego informativos. */
const SEVERITY_ORDER = { error: 0, warning: 1, info: 2 }

export function ValidationFindings({ findings }) {
  if (findings.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        La validación no generó hallazgos para esta factura.
      </p>
    )
  }

  const sorted = [...findings].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  )

  return (
    <ul className="flex flex-col gap-3">
      {sorted.map((finding) => {
        const { label, light } = SEVERITY[finding.severity]
        const styles = LIGHT_STYLES[light]
        const Icon = SEVERITY_ICON[finding.severity]
        const hasComparison = finding.expected !== undefined || finding.found !== undefined

        return (
          <li key={finding.id} className={cn('rounded-lg border p-3', styles.panel)}>
            <div className="flex items-start gap-3">
              <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <p className="text-sm font-medium">{finding.title}</p>
                  <span className="text-xs text-muted-foreground">
                    <span className="sr-only">{label}. </span>
                    {FINDING_CATEGORY_LABELS[finding.category]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{finding.description}</p>

                {hasComparison && (
                  <dl className="mt-3 grid grid-cols-2 gap-3 rounded-md bg-background/70 p-2 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Esperado</dt>
                      <dd className="font-medium tabular-nums">{finding.expected ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Encontrado</dt>
                      <dd className="font-medium tabular-nums">{finding.found ?? '—'}</dd>
                    </div>
                  </dl>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
