import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { IdCard } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { InvoiceCharacters } from '@/components/auth/InvoiceCharacters'
import { BrandMark } from '@/components/brand/BrandMark'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { useAuth } from '@/hooks/useAuth'
import { ApiError } from '@/lib/api'
import { loginSchema } from '@/lib/authSchemas'

function FieldError({ id, message }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="text-xs text-destructive">
      {message}
    </p>
  )
}

export default function LoginPage() {
  const { signIn } = useAuth()

  // Las facturas cierran los ojos mientras el mouse está sobre la contraseña o el campo tiene
  // el foco (así también se cierran con teclado y en pantallas táctiles, donde no hay "hover").
  const [passwordHovered, setPasswordHovered] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const eyesClosed = passwordHovered || passwordFocused

  const {
    register,
    handleSubmit,
    resetField,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { cedula: '', contraseña: '' },
  })

  // Al iniciar sesión, PublicOnlyRoute detecta la sesión y redirige; aquí no se navega.
  async function onSubmit(values) {
    try {
      await signIn(values)
      toast.success('Sesión iniciada')
    } catch (error) {
      const message =
        error instanceof ApiError && (error.status === 401 || error.status === 404)
          ? error.message
          : 'No se pudo iniciar sesión. Inténtalo de nuevo en unos minutos.'
      toast.error(message)
      resetField('contraseña')
      setFocus('contraseña')
    }
  }

  return (
    <div className="grid overflow-hidden rounded-[2rem] bg-muted p-3 md:min-h-[30rem] md:grid-cols-[1.1fr_1fr] md:p-4">
      {/* Una sola ilustración: arriba y pequeña en móvil, columna izquierda desde 768px. */}
      <div className="flex items-center justify-center px-4 pt-4 pb-5 md:p-6">
        <InvoiceCharacters className="w-40 sm:w-52 md:w-full md:max-w-md" eyesClosed={eyesClosed} />
      </div>

      <div className="flex flex-col justify-center rounded-3xl bg-background p-6 shadow-sm sm:p-8 md:p-10">
        <div className="mb-8 text-center">
          <BrandMark size="xl" className="mb-5" />
          <h1 className="text-2xl font-semibold tracking-tight">Tus facturas te esperan.</h1>
          <p className="mt-1 text-sm text-muted-foreground">Inicia sesión para continuar.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">

                    <div className="flex flex-col gap-1.5">
            <Label htmlFor="cedula">Cédula</Label>
            <div className="relative">
              <IdCard
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="cedula"
                inputMode="numeric"
                autoComplete="username"
                placeholder="Ej: 1234567890"
                className="pl-8"
                aria-invalid={Boolean(errors.cedula)}
                aria-describedby={errors.cedula ? 'cedula-error' : undefined}
                {...register('cedula')}
              />
            </div>
            <FieldError id="cedula-error" message={errors.cedula?.message} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contraseña">Contraseña</Label>
            {/* Los eventos de foco "suben" desde el campo y desde el botón de mostrar/ocultar, así
                que este contenedor cubre toda la casilla. `register` ya usa onBlur en el input;
                por eso los oyentes van aquí y no en el input. */}
            <div
              onPointerEnter={() => setPasswordHovered(true)}
              onPointerLeave={() => setPasswordHovered(false)}
              onFocus={() => setPasswordFocused(true)}
              onBlur={(event) => {
                // Si el foco pasa al botón de mostrar/ocultar, sigue "dentro" de la casilla.
                if (!event.currentTarget.contains(event.relatedTarget)) setPasswordFocused(false)
              }}
            >
              <PasswordInput
                id="contraseña"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.contraseña)}
                aria-describedby={errors.contraseña ? 'contraseña-error' : undefined}
                {...register('contraseña')}
              />
            </div>
            <FieldError id="contraseña-error" message={errors.contraseña?.message} />
          </div>

          <Button type="submit" size="lg" disabled={isSubmitting} className="mt-2 w-full">
            {isSubmitting ? 'Ingresando…' : 'Iniciar sesión'}
          </Button>
        </form>
      </div>
    </div>
  )
}
