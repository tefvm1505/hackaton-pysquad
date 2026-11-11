import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { invoiceFormSchema } from '@/lib/invoiceSchemas'
import { cn } from '@/lib/utils'

function toFormValues(invoice) {
  return {
    invoiceNumber: invoice.invoiceNumber,
    supplierName: invoice.supplierName,
    supplierNit: invoice.supplierNit,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    purchaseOrderNumber: invoice.purchaseOrderNumber,
    subtotal: invoice.subtotal,
    ivaAmount: invoice.ivaAmount,
    total: invoice.total,
  }
}

/**
 * Etiqueta + control + mensaje de error, conectados para lectores de pantalla.
 * `children` es una función que recibe los atributos aria para el control.
 */
function Field({ id, label, error, className, children }) {
  const errorId = `${id}-error`
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children({
        'aria-invalid': Boolean(error),
        'aria-describedby': error ? errorId : undefined,
      })}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * Formulario de datos extraídos de la factura.
 *
 * Props:
 *  - formId:   id del <form>; permite enviarlo desde botones fuera de él.
 *  - invoice:  factura a mostrar.
 *  - readOnly: facturas ya aprobadas o rechazadas no se editan.
 *  - onValid:  (values) => void, se llama solo si pasa la validación Zod.
 *  - onInvalid: () => void, se llama si hay errores.
 */
export function ExtractedDataForm({ formId, invoice, readOnly, onValid, onInvalid }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: toFormValues(invoice),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  const id = (name) => `${formId}-${name}`

  return (
    <form
      id={formId}
      noValidate
      onSubmit={handleSubmit(onValid, onInvalid)}
      aria-label="Datos extraídos de la factura"
    >
      <fieldset disabled={readOnly} className="grid min-w-0 gap-4 sm:grid-cols-2">
        <Field
          id={id('invoiceNumber')}
          label="Número de factura"
          error={errors.invoiceNumber?.message}
        >
          {(aria) => <Input id={id('invoiceNumber')} {...aria} {...register('invoiceNumber')} />}
        </Field>

        <Field
          id={id('purchaseOrderNumber')}
          label="Orden de compra"
          error={errors.purchaseOrderNumber?.message}
        >
          {(aria) => (
            <Input
              id={id('purchaseOrderNumber')}
              placeholder="Sin OC"
              {...aria}
              {...register('purchaseOrderNumber')}
            />
          )}
        </Field>

        <Field
          id={id('supplierName')}
          label="Proveedor"
          error={errors.supplierName?.message}
          className="sm:col-span-2"
        >
          {(aria) => <Input id={id('supplierName')} {...aria} {...register('supplierName')} />}
        </Field>

        <Field id={id('supplierNit')} label="NIT" error={errors.supplierNit?.message}>
          {(aria) => (
            <Input
              id={id('supplierNit')}
              placeholder="900.123.456-7"
              inputMode="numeric"
              {...aria}
              {...register('supplierNit')}
            />
          )}
        </Field>

        <Field id={id('currency')} label="Moneda" error={errors.currency?.message}>
          {(aria) => (
            <select
              id={id('currency')}
              {...aria}
              {...register('currency')}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive"
            >
              <option value="COP">COP - Peso colombiano</option>
              <option value="USD">USD - Dólar</option>
              <option value="EUR">EUR - Euro</option>
            </select>
          )}
        </Field>

        <Field id={id('issueDate')} label="Fecha de emisión" error={errors.issueDate?.message}>
          {(aria) => (
            <Input id={id('issueDate')} type="date" {...aria} {...register('issueDate')} />
          )}
        </Field>

        <Field id={id('dueDate')} label="Fecha de vencimiento" error={errors.dueDate?.message}>
          {(aria) => <Input id={id('dueDate')} type="date" {...aria} {...register('dueDate')} />}
        </Field>

        <Field id={id('subtotal')} label="Subtotal" error={errors.subtotal?.message}>
          {(aria) => (
            <Input
              id={id('subtotal')}
              type="number"
              step="any"
              inputMode="decimal"
              {...aria}
              {...register('subtotal', { valueAsNumber: true })}
            />
          )}
        </Field>

        <Field id={id('ivaAmount')} label="IVA" error={errors.ivaAmount?.message}>
          {(aria) => (
            <Input
              id={id('ivaAmount')}
              type="number"
              step="any"
              inputMode="decimal"
              {...aria}
              {...register('ivaAmount', { valueAsNumber: true })}
            />
          )}
        </Field>

        <Field
          id={id('total')}
          label="Total"
          error={errors.total?.message}
          className="sm:col-span-2"
        >
          {(aria) => (
            <Input
              id={id('total')}
              type="number"
              step="any"
              inputMode="decimal"
              {...aria}
              {...register('total', { valueAsNumber: true })}
            />
          )}
        </Field>
      </fieldset>
    </form>
  )
}
