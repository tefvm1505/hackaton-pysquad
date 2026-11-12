import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { InvoiceCharacters } from '@/components/auth/InvoiceCharacters'
import { BrandMark } from '@/components/brand/BrandMark'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
  const [loginError, setLoginError] = useState(null)
  const {
    register,
    control,
    handleSubmit,
    resetField,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '', remember: true },
  })

  // Al iniciar sesión, PublicOnlyRoute detecta la sesión y redirige; aquí no se navega.
  async function onSubmit(values) {
    setLoginError(null)
    try {
      await signIn(values)
      toast.success('Sesión iniciada')
    } catch (error) {
      // Mensaje genérico: no revela si falló el usuario o la contraseña.
      setLoginError(
        error instanceof ApiError && error.status === 401
          ? 'Correo o contraseña incorrectos.'
          : 'No se pudo iniciar sesión. Inténtalo de nuevo en unos minutos.',
      )
      resetField('password')
      setFocus('password')
    }
  }

  return (
    <div className="grid overflow-hidden rounded-[2rem] bg-muted p-3 md:min-h-[30rem] md:grid-cols-[1.1fr_1fr] md:p-4">
      {/* Una sola ilustración: arriba y pequeña en móvil, columna izquierda desde 768px. */}
      <div className="flex items-center justify-center px-4 pt-4 pb-5 md:p-6">
        <InvoiceCharacters className="w-40 sm:w-52 md:w-full md:max-w-md" />
      </div>

      <div className="flex flex-col justify-center rounded-3xl bg-background p-6 shadow-sm sm:p-8 md:p-10">
        <div className="mb-8 text-center">
          <BrandMark size="xl" className="mb-5" />
          <h1 className="text-2xl font-semibold tracking-tight">Tus facturas te esperan.</h1>
          <p className="mt-1 text-sm text-muted-foreground">Inicia sesión para continuar.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
          {loginError && (
            <Alert variant="destructive">
              <AlertDescription>{loginError}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="identifier">Correo o usuario</Label>
            <div className="relative">
              <Mail
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="identifier"
                autoComplete="username"
                placeholder="nombre@empresa.com"
                className="pl-8"
                aria-invalid={Boolean(errors.identifier)}
                aria-describedby={errors.identifier ? 'identifier-error' : undefined}
                {...register('identifier')}
              />
            </div>
            <FieldError id="identifier-error" message={errors.identifier?.message} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'password-error' : undefined}
              {...register('password')}
            />
            <FieldError id="password-error" message={errors.password?.message} />
          </div>

          <Controller
            name="remember"
            control={control}
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
                <Label htmlFor="remember" className="font-normal">
                  Recordarme
                </Label>
              </div>
            )}
          />

          <Button type="submit" size="lg" disabled={isSubmitting} className="mt-2 w-full">
            {isSubmitting ? 'Ingresando…' : 'Iniciar sesión'}
          </Button>
        </form>
      </div>
    </div>
  )
}
