import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Send, Sparkles, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * Burbuja líquida decorativa (simplificada).
 */
function LiquidBlob() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      <span className="absolute inset-1 animate-blob-morph bg-[radial-gradient(circle_at_30%_25%,oklch(0.6_0.2_285),oklch(0.24_0.04_270)_72%)] shadow-[0_10px_22px_-8px_rgba(40,30,90,0.6)] motion-reduce:animate-none motion-reduce:rounded-full" />
      <span className="absolute inset-0.5 animate-blob-morph bg-[radial-gradient(circle_at_72%_78%,oklch(0.72_0.15_235),transparent_62%)] opacity-70 mix-blend-screen [animation-delay:-3s] [animation-direction:reverse] [animation-duration:9s] motion-reduce:animate-none motion-reduce:rounded-full" />
      <span className="absolute top-3 left-3.5 h-2.5 w-4 -rotate-[25deg] rounded-full bg-white/45 blur-[1.5px]" />
    </span>
  )
}

/**
 * Asistente de IA flotante con chat real conectado a POST /chatIA.
 */
export function FloatingAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hola, soy tu asistente de IA. Puedes preguntarme sobre facturas, contratos, causaciones o cualquier dato del sistema.' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

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
    <div className="fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6">
      {/* Panel del chat */}
      {open && (
        <div className="mb-4 flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border bg-background shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
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
              onClick={() => setOpen(false)}
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

      {/* Botón flotante */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente de IA'}
        className="group relative flex size-14 items-center justify-center rounded-full text-white outline-none transition-transform hover:scale-110 focus-visible:ring-[3px] focus-visible:ring-ring/70 focus-visible:ring-offset-2"
      >
        <LiquidBlob />
        <span className="relative z-10">
          {open ? <X className="size-6" /> : <Sparkles className="size-6" />}
        </span>
      </button>
    </div>
  )
}
