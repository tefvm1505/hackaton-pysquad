import { z } from 'zod'

/**
 * Esquemas de validación de los formularios de revisión.
 *
 * `invoiceFormSchema` valida los datos extraídos que el contador puede corregir
 * antes de enviarlos a causación. Es la última barrera antes del backend.
 *
 * Los campos numéricos usan `register(name, { valueAsNumber: true })` en el
 * formulario, por eso aquí son `z.number()` y no `z.coerce.number()`.
 */

const NIT_REGEX = /^\d{1,3}(\.?\d{3}){2}-?\d$/
const NUMBER_ERROR = 'Ingresa un valor numérico'
const DATE_ERROR = 'Selecciona una fecha'

/** Tolerancia de redondeo al validar sumas (en unidades de la moneda). */
const ROUNDING_TOLERANCE = 1

const amount = (label) =>
  z.number({ error: NUMBER_ERROR }).min(0, `${label} no puede ser negativo`)

export const invoiceFormSchema = z
  .object({
    invoiceNumber: z.string().trim().min(1, 'El número de factura es obligatorio'),
    supplierName: z.string().trim().min(1, 'El proveedor es obligatorio'),
    supplierNit: z
      .string()
      .trim()
      .regex(NIT_REGEX, 'NIT inválido. Ejemplo: 900.123.456-7'),
    issueDate: z.string().min(1, DATE_ERROR),
    dueDate: z.string().min(1, DATE_ERROR),
    currency: z.enum(['COP', 'USD', 'EUR']),
    /** Opcional: algunos servicios se facturan sin orden de compra. */
    purchaseOrderNumber: z.string().trim(),
    subtotal: amount('El subtotal'),
    ivaAmount: amount('El IVA'),
    total: amount('El total'),
  })
  .refine((v) => !v.issueDate || !v.dueDate || v.dueDate >= v.issueDate, {
    path: ['dueDate'],
    error: 'El vencimiento no puede ser anterior a la emisión',
  })
  .refine(
    (v) => Math.abs(v.subtotal + v.ivaAmount - v.total) <= ROUNDING_TOLERANCE,
    {
      path: ['total'],
      error: 'El total debe ser igual a subtotal + IVA',
    },
  )

/** Motivo de rechazo: obligatorio para dejar trazabilidad contable. */
export const rejectionSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, 'Describe el motivo con al menos 10 caracteres')
    .max(500, 'Máximo 500 caracteres'),
})
