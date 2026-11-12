import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ROUTES } from '@/config/routes'
import { resolveException } from '@/lib/api'
import { resolutionSchema } from '@/lib/exceptionSchemas'
import { formatDateTime } from '@/lib/format'
import { EXCEPTION_STAGE } from '@/lib/semaphore'
import { ExceptionBadgeGroup } from './ExceptionBadges'

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  )
}

/** Formulario para resolver. Vive aparte para que se reinicie al abrir otra excepción. */
function ResolveForm({ exception, onClose, onResolved }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(resolutionSchema), defaultValues: { note: '' } })

  async function submit({ note }) {
    try {
      const updated = await resolveException(exception.id, note)
      toast.success('Excepción resuelta', { description: exception.code })
      onResolved(updated)
      onClose()
    } catch (error) {
      toast.error('No se pudo resolver la excepción', {
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="grid gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="resolution-note">Nota de resolución</Label>
        <Textarea
          id="resolution-note"
          rows={3}
          placeholder="Ej. Se confirmó con el proveedor y se corrigió el valor."
          aria-invalid={Boolean(errors.note)}
          aria-describedby={errors.note ? 'resolution-note-error' : 'resolution-note-help'}
          {...register('note')}
        />
        {errors.note ? (
          <p id="resolution-note-error" role="alert" className="text-xs text-destructive">
            {errors.note.message}
          </p>
        ) : (
          <p id="resolution-note-help" className="text-xs text-muted-foreground">
            Queda en el historial de auditoría junto con tu usuario y la fecha.
          </p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : 'Marcar como resuelta'}
        </Button>
      </DialogFooter>
    </form>
  )
}

/**
 * Detalle de una excepción. Si está abierta, permite resolverla con una nota;
 * si ya está resuelta, muestra quién la resolvió, cuándo y por qué.
 */
export function ExceptionDetailDialog({ exception, onClose, onResolved }) {
  return (
    <Dialog open={exception !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {exception && (
          <>
            <DialogHeader>
              <DialogTitle className="leading-snug">{exception.message}</DialogTitle>
              <DialogDescription className="sr-only">
                Detalle de la excepción {exception.code}
              </DialogDescription>
            </DialogHeader>

            <ExceptionBadgeGroup exception={exception} />

            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Código">
                <span className="font-mono text-xs">{exception.code}</span>
              </Field>
              <Field label="Etapa">{EXCEPTION_STAGE[exception.stage]}</Field>
              <Field label="Fecha">{formatDateTime(exception.occurredAt)}</Field>
              <Field label="Factura">
                {exception.invoiceId ? (
                  <Link
                    to={ROUTES.invoiceReview(exception.invoiceId)}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {exception.invoiceNumber}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">Sin factura asociada</span>
                )}
                {exception.supplierName && (
                  <span className="block text-xs text-muted-foreground">{exception.supplierName}</span>
                )}
              </Field>
              {exception.details && (
                <div className="sm:col-span-2">
                  <Field label="Detalle">
                    <span className="leading-relaxed">{exception.details}</span>
                  </Field>
                </div>
              )}
            </dl>

            {exception.status === 'resolved' && exception.resolution ? (
              <div className="rounded-lg border border-success/30 bg-success-soft p-3 text-sm">
                <p className="font-medium">Resuelta por {exception.resolution.by}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(exception.resolution.at)}</p>
                <p className="mt-2 leading-relaxed">{exception.resolution.note}</p>
              </div>
            ) : (
              <ResolveForm key={exception.id} exception={exception} onClose={onClose} onResolved={onResolved} />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
