import { Check, Circle, LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  { id: 'upload', label: 'Subiendo el documento' },
  { id: 'read', label: 'Leyendo y extrayendo los datos' },
  { id: 'validate', label: 'Validando contra la orden de compra y el IVA' },
  { id: 'check', label: 'Buscando duplicados y verificando el proveedor' },
]

/** Lista de pasos del análisis: los anteriores al actual aparecen completados. */
export function ProcessingSteps({ currentStage }) {
  const currentIndex = Math.max(0, STEPS.findIndex((step) => step.id === currentStage))

  return (
    <ol className="space-y-3" aria-label="Pasos del análisis">
      {STEPS.map((step, index) => {
        const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'pending'
        return (
          <li
            key={step.id}
            aria-current={state === 'current' ? 'step' : undefined}
            className={cn(
              'flex items-center gap-3 text-sm',
              state === 'pending' && 'text-muted-foreground',
              state === 'current' && 'font-medium',
            )}
          >
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full border',
                state === 'done' && 'border-success bg-success text-success-foreground',
              )}
            >
              {state === 'done' && <Check aria-hidden className="size-3.5" />}
              {state === 'current' && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
              {state === 'pending' && <Circle aria-hidden className="size-2 fill-current opacity-40" />}
            </span>
            <span>{step.label}</span>
            <span className="sr-only">
              {state === 'done' ? '(completado)' : state === 'current' ? '(en curso)' : '(pendiente)'}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
