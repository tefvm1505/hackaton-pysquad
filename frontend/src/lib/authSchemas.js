import { z } from 'zod'

/**
 * Validación del formulario de inicio de sesión.
 * No se validan reglas de formato de contraseña aquí: eso lo decide el backend.
 */
export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Ingresa tu correo o usuario'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
  remember: z.boolean(),
})
