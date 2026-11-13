import { z } from 'zod'
import { BILLING_FREQUENCY, CONTRACT_TYPE } from './semaphore'

/**
 * Validación del formulario de revisión de un contrato.
 *
 * Los campos numéricos usan `register(name, { valueAsNumber: true })`, por eso aquí son
 * `z.number()` y no `z.coerce.number()`. La parte `reviewed` son las tres confirmaciones
 * manuales: sin las tres marcadas no se puede validar el contrato.
 */

const NIT_REGEX = /^\d{1,3}(\.?\d{3}){2}-?\d$/
const NUMBER_ERROR = 'Ingresa un valor numérico'
const CONFIRM_ERROR = 'Confirma esta revisión para poder validar'

const confirmed = (message) => z.literal(true, { error: message })

export const contractFormSchema = z
  .object({
    // Detalles
    contractNumber: z.string().trim().min(1, 'El número de contrato es obligatorio'),
    counterpartyName: z.string().trim().min(1, 'La contraparte es obligatoria'),
    counterpartyNit: z.string().trim().regex(NIT_REGEX, 'NIT inválido. Ejemplo: 900.123.456-7'),
    object: z
      .string()
      .trim()
      .min(10, 'Describe el objeto con al menos 10 caracteres')
      .max(500, 'Máximo 500 caracteres'),
    startDate: z.string().min(1, 'Selecciona una fecha'),
    endDate: z.string().min(1, 'Selecciona una fecha'),
    paymentTermsDays: z
      .number({ error: NUMBER_ERROR })
      .int('Debe ser un número entero de días')
      .min(0, 'No puede ser negativo')
      .max(365, 'Máximo 365 días'),
    costCenter: z.string().trim().max(40, 'Máximo 40 caracteres'),

    // Montos
    amount: z.number({ error: NUMBER_ERROR }).positive('El valor debe ser mayor a 0'),
    ivaRate: z.number({ error: NUMBER_ERROR }).refine((v) => [0, 5, 19].includes(v), 'El IVA debe ser 0%, 5% o 19%'),
    currency: z.enum(['COP', 'USD', 'EUR']),
    billingFrequency: z.enum(Object.keys(BILLING_FREQUENCY)),

    // Tipo
    type: z.enum(Object.keys(CONTRACT_TYPE)),

    // Las tres revisiones manuales
    reviewed: z.object({
      details: confirmed(CONFIRM_ERROR),
      amounts: confirmed(CONFIRM_ERROR),
      type: confirmed(CONFIRM_ERROR),
    }),
  })
  .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, {
    path: ['endDate'],
    error: 'La fecha de fin no puede ser anterior a la de inicio',
  })

/** Motivo de la observación: obligatorio para que quien corrige sepa qué falta. */
export const observationSchema = z.object({
  note: z
    .string()
    .trim()
    .min(10, 'Explica qué hay que corregir con al menos 10 caracteres')
    .max(500, 'Máximo 500 caracteres'),
})
