import { useLayoutEffect, useState } from 'react'

/**
 * Coloca un "indicador" (la pieza en relieve del selector) debajo de la pestaña activa
 * de una lista de pestañas de Radix, y lo mantiene ahí cuando algo cambia.
 *
 * El hook solo escribe la posición y el tamaño; el movimiento fluido lo hace la
 * transición CSS del indicador. Devuelve `true` cuando ya se puede animar: el primer
 * acomodo (al montar) se hace SIN animación para que no "entre deslizándose" desde la esquina.
 *
 * La lista debe tener `position: relative` (las medidas son relativas a ella).
 *
 * Qué dispara un nuevo acomodo:
 *  - cambio de pestaña activa (Radix cambia `data-state`)
 *  - cambio de tamaño de la lista o de las pestañas (pantalla, conteos, fuente, saltos de línea)
 *  - carga de las fuentes (cambian los anchos del texto)
 *
 * @param {React.RefObject<HTMLElement>} listRef
 * @param {React.RefObject<HTMLElement>} indicatorRef
 * @param {boolean} enabled
 */
export function useSlidingIndicator(listRef, indicatorRef, enabled) {
  const [animated, setAnimated] = useState(false)

  useLayoutEffect(() => {
    if (!enabled) return undefined
    const list = listRef.current
    const indicator = indicatorRef.current
    if (!list || !indicator) return undefined

    function place() {
      const active = list.querySelector('[role="tab"][data-state="active"]')
      // Oculto (display: none) o sin pestaña activa: no hay nada que medir.
      if (!active || active.offsetWidth === 0) {
        indicator.style.opacity = '0'
        return
      }
      indicator.style.opacity = '1'
      indicator.style.width = `${active.offsetWidth}px`
      indicator.style.height = `${active.offsetHeight}px`
      indicator.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`
    }

    place()

    const mutations = new MutationObserver(place)
    mutations.observe(list, { attributes: true, attributeFilter: ['data-state'], subtree: true })

    const resizes = new ResizeObserver(place)
    resizes.observe(list)
    list.querySelectorAll('[role="tab"]').forEach((tab) => resizes.observe(tab))

    let cancelled = false
    document.fonts?.ready.then(() => {
      if (!cancelled) place()
    })

    // Las transiciones se activan después del primer pintado.
    const frame = requestAnimationFrame(() => setAnimated(true))

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      mutations.disconnect()
      resizes.disconnect()
    }
  }, [enabled, listRef, indicatorRef])

  return animated
}
