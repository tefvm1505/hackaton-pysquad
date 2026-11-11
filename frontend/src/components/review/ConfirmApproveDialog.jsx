import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/** Segunda confirmación cuando se intenta aprobar una factura con errores críticos. */
export function ConfirmApproveDialog({
  open,
  onOpenChange,
  errorCount,
  isSubmitting,
  onConfirm,
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert aria-hidden className="size-4 text-danger" />
            Aprobar con errores críticos
          </DialogTitle>
          <DialogDescription>
            Esta factura tiene {errorCount}{' '}
            {errorCount === 1 ? 'hallazgo crítico' : 'hallazgos críticos'} sin resolver. Si la
            apruebas, pasará a causación con esas diferencias.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Volver a revisar
          </Button>
          <Button type="button" disabled={isSubmitting} onClick={onConfirm}>
            {isSubmitting ? 'Aprobando…' : 'Aprobar de todos modos'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
