import { Loader2 } from 'lucide-react'

/** Pantalla mientras se confirma la sesión. No muestra nada del contenido protegido. */
export function SessionCheck() {
  return (
    <div
      role="status"
      className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted-foreground"
    >
      <Loader2 aria-hidden className="size-4 animate-spin" />
      Verificando sesión…
    </div>
  )
}
