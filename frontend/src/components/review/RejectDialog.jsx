import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
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
import { rejectionSchema } from '@/lib/invoiceSchemas'

/**
 * Diálogo para rechazar una factura con motivo obligatorio.
 * `onConfirm(reason)` debe ser async y lanzar si falla, para que el diálogo
 * permanezca abierto y el usuario pueda reintentar.
 */
export function RejectDialog({ open, onOpenChange, invoiceNumber, onConfirm }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(rejectionSchema),
    defaultValues: { reason: '' },
  })

  async function submit({ reason }) {
    try {
      await onConfirm(reason)
      reset()
    } catch {
      // El llamador ya mostró el toast de error; se mantiene abierto para reintentar.
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Evita cerrar mientras se envía (se perdería el feedback del resultado).
        if (isSubmitting) return
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit(submit)} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Rechazar factura {invoiceNumber}</DialogTitle>
            <DialogDescription>
              El motivo queda registrado en el historial de la factura.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rejection-reason">Motivo del rechazo</Label>
            <Textarea
              id="rejection-reason"
              rows={4}
              placeholder="Ej. El valor facturado excede la orden de compra. Solicitar nota crédito."
              aria-invalid={Boolean(errors.reason)}
              aria-describedby={errors.reason ? 'rejection-reason-error' : undefined}
              {...register('reason')}
            />
            {errors.reason && (
              <p id="rejection-reason-error" role="alert" className="text-xs text-destructive">
                {errors.reason.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? 'Rechazando…' : 'Rechazar factura'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
