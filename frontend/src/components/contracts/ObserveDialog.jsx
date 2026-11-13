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
import { observationSchema } from '@/lib/contractSchemas'

/**
 * Diálogo para dejar observaciones en un contrato, con el motivo obligatorio.
 * `onConfirm(note)` debe ser async y lanzar si falla, para que el diálogo quede abierto
 * y se pueda reintentar.
 */
export function ObserveDialog({ open, onOpenChange, contractNumber, onConfirm }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(observationSchema), defaultValues: { note: '' } })

  async function submit({ note }) {
    try {
      await onConfirm(note)
      reset()
    } catch {
      // Quien llama ya mostró el aviso de error; se mantiene abierto para reintentar.
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isSubmitting) return
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit(submit)} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Dejar observaciones en {contractNumber}</DialogTitle>
            <DialogDescription>
              El contrato quedará marcado como "Con observaciones" y el motivo se guarda en su historial.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="observation-note">¿Qué hay que corregir?</Label>
            <Textarea
              id="observation-note"
              rows={4}
              placeholder="Ej. El valor del contrato no coincide con el anexo firmado."
              aria-invalid={Boolean(errors.note)}
              aria-describedby={errors.note ? 'observation-note-error' : undefined}
              {...register('note')}
            />
            {errors.note && (
              <p id="observation-note-error" role="alert" className="text-xs text-destructive">
                {errors.note.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Dejar observaciones'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
