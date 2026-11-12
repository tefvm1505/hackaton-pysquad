import { z } from 'zod'

/**
 * Nota al marcar una excepción como resuelta. Es obligatoria para que el log de
 * auditoría explique qué se hizo y por qué.
 */
export const resolutionSchema = z.object({
  note: z
    .string()
    .trim()
    .min(10, 'Describe qué hiciste con al menos 10 caracteres')
    .max(500, 'Máximo 500 caracteres'),
})
