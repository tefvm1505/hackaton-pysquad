import { z } from 'zod'

/**
 * Validación del formulario de inicio de sesión.
 * No se validan reglas de formato de contraseña aquí: eso lo decide el backend.
 */
export const loginSchema = z.object({
  cedula: z
    .string()
    .trim()
    .min(1, 'Ingresa tu cédula')
    .regex(/^\d+$/, 'La cédula solo debe contener números'),
  contraseña: z.string().min(1, 'Ingresa tu contraseña'),
})
