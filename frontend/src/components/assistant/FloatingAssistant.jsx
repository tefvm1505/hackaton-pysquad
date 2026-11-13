import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Loader2, Send, Sparkles, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useKeyboardModality } from '@/hooks/useKeyboardModality'
import { useZeroGravityDrift } from '@/hooks/useZeroGravityDrift'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'

/** Tiempo que la burbuja flota sola antes de convertirse en rectángulo con el mensaje. */
const PROMPT_DELAY_MS = 3500

/** Antes de convertirse en rectángulo, la burbuja vuelve a su sitio durante este tiempo, para
 * estirarse ya quieta y sin saltos. */
const HOMING_MS = 1500

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
 * Asistente de IA flotante, abajo a la derecha, en todas las pantallas de la app. El chat está
 * conectado a POST /chatIA.
 *
 * Empieza como una burbuja líquida que flota con una deriva lenta ("gravedad cero"). A los
 * pocos segundos se estira en un rectángulo líquido con el mensaje "¿Necesitas ayuda?": su
 * contorno sigue cambiando, pero el rectángulo no se desplaza. Al tocar la burbuja o el
 * rectángulo se abre el chat encima, y la burbuja se queda en su sitio mostrando una X para
 * cerrarlo.
 */
export function FloatingAssistant() {
  const keyboard = useKeyboardModality()
  const panelId = useId()
  const driftRef = useRef(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const [homing, setHoming] = useState(false) // la burbuja vuelve a su sitio para estirarse
  const [prompting, setPrompting] = useState(false) // false = burbuja, true = rectángulo
  const [dismissed, setDismissed] = useState(false)
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hola, soy tu asistente de IA. Puedes preguntarme sobre facturas, contratos, causaciones o cualquier dato del sistema.' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

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
  // (solo cambia el contorno): un botón que se desplaza es incómodo de pulsar. Con el chat
  // abierto la deriva se pausa: la burbuja (ahora con la X) se queda donde estaba y el chat no
  // se separa de ella.
  useZeroGravityDrift(driftRef, { active: !parked, paused: open })

  function setChatOpen(next) {
    setOpen(next)
    // Quien ya abrió el chat vio el mensaje: no se vuelve a ofrecer el rectángulo.
    if (next) setDismissed(true)
  }

  // Auto-scroll al final cuando llegan mensajes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input al abrir
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  const sendMessage = useCallback(async () => {
    const pregunta = input.trim()
    if (!pregunta || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text: pregunta }])
    setLoading(true)

    try {
      // Obtener cédula del usuario guardado en session
      const storedUser = sessionStorage.getItem('facto:user')
      const cedula = storedUser ? JSON.parse(storedUser).id : 0

      const response = await apiFetch('/chatIA', {
        method: 'POST',
        body: JSON.stringify({ pregunta, cedula: Number(cedula) }),
      })

      // El backend retorna un string directamente
      const text = typeof response === 'string' ? response : JSON.stringify(response)
      setMessages((prev) => [...prev, { role: 'assistant', text }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Lo siento, no pude procesar tu pregunta. Inténtalo de nuevo.' },
      ])
    } finally {
      setLoading(false)
    }
  }, [input, loading])

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage()
    }
  }

  return (
    // El contenedor deja pasar los clics; solo el chat y la burbuja los reciben.
    <div className="pointer-events-none fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6">
      {/* useZeroGravityDrift mueve este contenedor. `items-end` deja la burbuja pegada a la
          derecha aunque el chat abierto sea más ancho que ella. El giro se hace sobre el centro
          de la burbuja (64 px, abajo a la derecha): si el pivote fuera el centro del contenedor,
          al abrir el chat el contenedor crece y la burbuja se correría de sitio. */}
      <div ref={driftRef} className="flex origin-[calc(100%-2rem)_calc(100%-2rem)] flex-col items-end">
        {/* Panel del chat */}
        {open && (
          <div
            id={panelId}
            role="dialog"
            aria-label="Asistente de Facto"
            // El ancho máximo deja margen para la deriva de la burbuja, que puede haberse
            // pausado un poco a la izquierda de su sitio.
            className="pointer-events-auto mb-4 flex w-[22rem] max-w-[calc(100vw-3rem)] flex-col rounded-2xl border bg-background shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Sparkles aria-hidden className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Asistente de Facto</p>
                <p className="text-xs text-muted-foreground">Pregunta lo que necesites</p>
              </div>
              <Badge variant="outline" className="shrink-0">IA</Badge>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="flex size-7 items-center justify-center rounded-full hover:bg-muted"
                aria-label="Cerrar chat"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>

            {/* Mensajes */}
            <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: '20rem' }}>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'ml-auto rounded-br-sm bg-primary text-primary-foreground'
                      : 'mr-auto rounded-bl-sm bg-muted/60 text-foreground',
                  )}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>
              ))}

              {loading && (
                <div className="mr-auto flex items-center gap-2 rounded-2xl rounded-bl-sm bg-muted/60 px-4 py-3">
                  <Loader2 aria-hidden className="size-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Pensando...</span>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t p-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe tu pregunta..."
                  rows={1}
                  disabled={loading}
                  className="flex-1 resize-none rounded-xl border bg-muted/30 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:opacity-50"
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="size-9 shrink-0 rounded-xl"
                >
                  <Send aria-hidden className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Burbuja / rectángulo */}
        <div className="pointer-events-auto relative">
          <button
            type="button"
            onClick={() => setChatOpen(!open)}
            aria-expanded={open}
            aria-controls={open ? panelId : undefined}
            aria-label={
              showPrompt ? '¿Necesitas ayuda? Soy tu asistente de IA' : open ? 'Cerrar asistente' : 'Abrir asistente de IA'
            }
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
                {open ? (
                  <X aria-hidden className="size-6 text-white" />
                ) : (
                  <Sparkles aria-hidden className="size-6 text-white" />
                )}
              </span>
            </span>
          </button>

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
      </div>
    </div>
  )
}
