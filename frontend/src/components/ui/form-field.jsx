import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/**
 * Etiqueta + control + mensaje de error, conectados para lectores de pantalla.
 * `children` es una función que recibe los atributos aria que hay que poner en el control:
 *
 *   <FormField id="x" label="Nombre" error={errors.x?.message}>
 *     {(aria) => <Input id="x" {...aria} {...register('x')} />}
 *   </FormField>
 */
function FormField({ id, label, error, hint, className, children }) {
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = error ? errorId : hint ? hintId : undefined

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children({
        "aria-invalid": Boolean(error),
        "aria-describedby": describedBy,
      })}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

export { FormField }
