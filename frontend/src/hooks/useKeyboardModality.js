import { useSyncExternalStore } from 'react'

/**
 * ¿Lo último que hizo la persona fue usar el teclado? (y no el mouse, el dedo o el lápiz)
 *
 * Sirve para mostrar el indicador de foco solo a quien navega con teclado. No se usa
 * `:focus-visible` porque lo decide el navegador y, en Chromium, tras usar el teclado una sola
 * vez (por ejemplo, Enter al iniciar sesión) sigue marcándose aunque después se haga clic con
 * el mouse, y el recuadro aparece donde no debe.
 *
 * Es un único registro compartido: los oyentes de la ventana se activan con el primer
 * componente que lo use y se quitan cuando ya no queda ninguno.
 */

let keyboard = false
const listeners = new Set()

function set(value) {
  if (keyboard === value) return
  keyboard = value
  for (const listener of listeners) listener()
}

// Pulsar solo un modificador (Shift, Ctrl…) no es navegar con teclado.
const MODIFIERS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'])
const onKeyDown = (event) => {
  if (!MODIFIERS.has(event.key)) set(true)
}
const onPointerDown = () => set(false)

function subscribe(listener) {
  if (listeners.size === 0) {
    keyboard = false // se empieza de cero para no arrastrar un valor viejo
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('pointerdown', onPointerDown, true)
  }
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('pointerdown', onPointerDown, true)
    }
  }
}

export function useKeyboardModality() {
  return useSyncExternalStore(subscribe, () => keyboard, () => false)
}
