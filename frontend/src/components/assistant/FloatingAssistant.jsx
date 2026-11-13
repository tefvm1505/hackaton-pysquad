import { useEffect, useRef, useState } from 'react'
import { ArrowRight, FileSignature, FileUp, ReceiptText, Sparkles, TriangleAlert, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ROUTES } from '@/config/routes'
import { useKeyboardModality } from '@/hooks/useKeyboardModality'
import { useZeroGravityDrift } from '@/hooks/useZeroGravityDrift'
import { cn } from '@/lib/utils'

/** Tiempo que la burbuja flota sola antes de convertirse en rectángulo con el mensaje. */
const PROMPT_DELAY_MS = 3500

/** Antes de convertirse en rectángulo, la burbuja vuelve a su sitio durante este tiempo, para
 * estirarse ya quieta y sin saltos. */
const HOMING_MS = 1500

const SHORTCUTS = [
  { to: ROUTES.upload, label: 'Subir una factura', icon: FileUp },
  { to: ROUTES.invoices, label: 'Revisar mis facturas', icon: ReceiptText },
  { to: ROUTES.contracts, label: 'Validar un contrato', icon: FileSignature },
  { to: ROUTES.exceptions, label: 'Ver excepciones', icon: TriangleAlert },
]

/**
 * La burbuja: varias capas con el contorno irregular que cambia lentamente, para que se vea
 * como una gota de líquido, más un brillo. Todo es decoración (oculto a lectores de pantalla).
 * Con "reducir movimiento" queda como un círculo quieto.
 */
function LiquidBlob({ hidden }) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 transition-[opacity,transform] duration-500 group-hover:scale-110',
        hidden ? 'scale-50 opacity-0' : 'scale-100 opacity-100',
      )}
    >
      <span className="absolute inset-1 animate-blob-morph bg-[radial-gradient(circle_at_30%_25%,oklch(0.6_0.2_285),oklch(0.24_0.04_270)_72%)] shadow-[0_10px_22px_-8px_rgba(40,30,90,0.6)] motion-reduce:animate-none motion-reduce:rounded-full" />
      <span className="absolute inset-0.5 animate-blob-morph bg-[radial-gradient(circle_at_72%_78%,oklch(0.72_0.15_235),transparent_62%)] opacity-70 mix-blend-screen [animation-delay:-3s] [animation-direction:reverse] [animation-duration:9s] motion-reduce:animate-none motion-reduce:rounded-full" />
      <span className="absolute inset-1.5 animate-blob-morph bg-[radial-gradient(circle_at_25%_75%,oklch(0.78_0.14_350),transparent_58%)] opacity-60 mix-blend-screen [animation-delay:-5s] [animation-duration:11s] motion-reduce:animate-none motion-reduce:rounded-full" />
      <span className="absolute top-3 left-3.5 h-2.5 w-4 -rotate-[25deg] rounded-full bg-white/45 blur-[1.5px]" />
    </span>
  )
}

/**
 * El fondo del rectángulo: los mismos colores de la burbuja, con un contorno que cambia y un
 * leve temblor, para que se lea como la misma gota estirada. Los brillos quedan a la derecha,
 * lejos del texto, para que el mensaje siga siendo legible. Decoración pura.
 */
function LiquidPill({ visible }) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 transition-[opacity,transform] group-hover:scale-[1.03] motion-reduce:transition-none',
        // Aparece rápido (la burbuja se funde encima) y se va despacio (el texto se apaga antes).
        visible ? 'opacity-100 duration-200' : 'opacity-0 duration-500',
      )}
    >
      <span className="absolute inset-0 animate-jelly motion-reduce:animate-none">
        <span className="absolute inset-0 animate-blob-morph-wide bg-[radial-gradient(ellipse_at_12%_10%,oklch(0.47_0.18_285),oklch(0.24_0.05_272)_68%)] shadow-[0_14px_30px_-10px_rgba(40,30,90,0.6)] motion-reduce:animate-none motion-reduce:rounded-full" />
        <span className="absolute inset-0 animate-blob-morph-wide bg-[radial-gradient(70px_48px_at_90%_60%,oklch(0.72_0.15_235),transparent)] opacity-70 mix-blend-screen [animation-delay:-2s] [animation-direction:reverse] [animation-duration:8s] motion-reduce:animate-none motion-reduce:rounded-full" />
        <span className="absolute inset-0 animate-blob-morph-wide bg-[radial-gradient(90px_40px_at_74%_115%,oklch(0.78_0.14_350),transparent)] opacity-45 mix-blend-screen [animation-delay:-4s] [animation-duration:10s] motion-reduce:animate-none motion-reduce:rounded-full" />
        <span className="absolute top-1.5 left-8 h-1.5 w-12 -rotate-[3deg] rounded-full bg-white/30 blur-[2px]" />
      </span>
    </span>
  )
}

/**
 * Asistente de IA flotante, abajo a la derecha, en todas las pantallas de la app.
 *
 * Empieza como una burbuja líquida que flota con una deriva lenta ("gravedad cero"). A los
 * pocos segundos se estira en un rectángulo líquido con el mensaje "¿Necesitas ayuda?": su
 * contorno sigue cambiando, pero el rectángulo no se desplaza. Al tocarlo se abre un panel
 * con atajos.
 *
 * La conversación con el asistente todavía no existe: depende del backend de IA. El panel
 * lo dice abiertamente en lugar de simular respuestas.
 */
export function FloatingAssistant() {
  const keyboard = useKeyboardModality()
  const driftRef = useRef(null)
  const [homing, setHoming] = useState(false) // la burbuja vuelve a su sitio para estirarse
  const [prompting, setPrompting] = useState(false) // false = burbuja, true = rectángulo
  const [dismissed, setDismissed] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const homingId = setTimeout(() => setHoming(true), PROMPT_DELAY_MS - HOMING_MS)
    const promptId = setTimeout(() => setPrompting(true), PROMPT_DELAY_MS)
    return () => {
      clearTimeout(homingId)
      clearTimeout(promptId)
    }
  }, [])

  const showPrompt = prompting && !dismissed && !open
  // Quieta en su sitio: a punto de convertirse en rectángulo, o ya convertida.
  const parked = homing && !dismissed && !open

  // Solo flota mientras es burbuja. El rectángulo y su botón de cerrar se quedan en su sitio
  // (solo cambia el contorno): un botón que se desplaza es incómodo de pulsar. Con el panel
  // abierto la deriva se pausa para que el panel no se separe de la burbuja.
  useZeroGravityDrift(driftRef, { active: !parked, paused: open })

  return (
    // El contenedor deja pasar los clics; solo la burbuja los recibe.
    <div className="pointer-events-none fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6">
      {/* useZeroGravityDrift mueve este contenedor. */}
      <div ref={driftRef}>
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next)
            // Quien ya abrió el panel vio el mensaje: no se vuelve a ofrecer el rectángulo.
            if (next) setDismissed(true)
          }}
        >
          <div className="pointer-events-auto relative flex justify-end">
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={showPrompt ? '¿Necesitas ayuda? Soy tu asistente de IA' : 'Abrir el asistente de IA'}
                className={cn(
                  // El fondo lo pintan LiquidPill y LiquidBlob; el botón solo cambia de ancho.
                  'group relative flex h-16 items-center justify-end rounded-full text-left text-white outline-none',
                  'transition-[width] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none',
                  showPrompt ? 'w-72 max-w-[calc(100vw-2rem)]' : 'w-16',
                  // Anillo solo para quien navega con teclado (ver useKeyboardModality).
                  keyboard && 'focus-visible:ring-[3px] focus-visible:ring-ring/70 focus-visible:ring-offset-2',
                )}
              >
                <LiquidPill visible={showPrompt} />

                <span
                  aria-hidden={!showPrompt}
                  className={cn(
                    'absolute inset-y-0 right-16 left-0 flex flex-col justify-center pl-5 leading-tight transition-opacity duration-300 motion-reduce:transition-none',
                    showPrompt ? 'opacity-100 delay-300' : 'pointer-events-none opacity-0',
                  )}
                >
                  <span className="text-sm font-semibold">¿Necesitas ayuda?</span>
                  <span className="text-xs text-white/80">Soy tu asistente de IA</span>
                </span>

                <span className="relative size-16 shrink-0">
                  <LiquidBlob hidden={showPrompt} />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Sparkles aria-hidden className="size-6 text-white" />
                  </span>
                </span>
              </button>
            </PopoverTrigger>

            {showPrompt && (
              <button
                type="button"
                onClick={() => setDismissed(true)}
                aria-label="Cerrar sugerencia del asistente"
                className="absolute -top-1 left-1 flex size-6 animate-in items-center justify-center rounded-full bg-background text-foreground shadow-md ring-1 ring-foreground/15 duration-300 fade-in hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <X aria-hidden className="size-3.5" />
              </button>
            )}
          </div>

          <PopoverContent side="top" align="end" sideOffset={16} className="w-80 max-w-[calc(100vw-2rem)] p-0">
            <div className="flex items-center gap-3 border-b p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Sparkles aria-hidden className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">Asistente de Facto</p>
                <p className="text-xs text-muted-foreground">Tu asistente de IA</p>
              </div>
              <Badge variant="outline" className="ml-auto shrink-0">
                IA
              </Badge>
            </div>

            <div className="space-y-4 p-4">
              <p className="rounded-2xl rounded-tl-sm bg-muted/60 p-3 text-sm leading-relaxed">
                Hola, soy tu asistente de IA. ¿A dónde quieres ir?
              </p>

              <nav aria-label="Atajos del asistente">
                <ul className="space-y-1">
                  {SHORTCUTS.map(({ to, label, icon: Icon }) => (
                    <li key={to}>
                      <PopoverClose asChild>
                        <Link
                          to={to}
                          className="group/link flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Icon aria-hidden className="size-4 text-muted-foreground" />
                          <span className="flex-1">{label}</span>
                          <ArrowRight
                            aria-hidden
                            className="size-4 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover/link:translate-x-0 group-hover/link:opacity-100"
                          />
                        </Link>
                      </PopoverClose>
                    </li>
                  ))}
                </ul>
              </nav>

              <p className="text-xs leading-relaxed text-muted-foreground">
                La conversación contigo estará disponible cuando se conecte el servicio de IA.
              </p>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
