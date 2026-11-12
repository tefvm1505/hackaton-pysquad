import { useEffect } from 'react'

/** Máximo desplazamiento de la pupila, en unidades del SVG. */
export const MAX_PUPIL_OFFSET = 6.5

/** Distancia (px) del mouse a partir de la cual la pupila llega al borde del ojo. */
const FULL_TRAVEL_PX = 140

/**
 * Hace que las pupilas dentro de un <svg> miren hacia el puntero.
 *
 * Marcado esperado dentro del SVG:
 *   <g data-eye>           contenedor de un ojo (se usa su centro como origen)
 *     <circle ... />       esclerótica
 *     <circle data-pupil/> pupila, la única que se mueve
 *   </g>
 *
 * Mueve las pupilas escribiendo `style.transform` directamente (sin re-render de
 * React) y agrupa los eventos con requestAnimationFrame. Si el usuario prefiere
 * movimiento reducido, las pupilas se quedan quietas.
 *
 * @param {React.RefObject<SVGSVGElement>} svgRef
 */
export function useEyeTracking(svgRef) {
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const eyes = [...svg.querySelectorAll('[data-eye]')].map((eye) => ({
      eye,
      pupil: eye.querySelector('[data-pupil]'),
    }))

    let pointer = null
    let frame = 0

    function update() {
      frame = 0
      if (!pointer) return

      for (const { eye, pupil } of eyes) {
        if (!pupil) continue
        const box = eye.getBoundingClientRect()
        const dx = pointer.x - (box.left + box.width / 2)
        const dy = pointer.y - (box.top + box.height / 2)
        const distance = Math.hypot(dx, dy)

        if (distance === 0) {
          pupil.style.transform = 'translate(0px, 0px)'
          continue
        }

        const reach = MAX_PUPIL_OFFSET * Math.min(1, distance / FULL_TRAVEL_PX)
        const x = (dx / distance) * reach
        const y = (dy / distance) * reach
        pupil.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`
      }
    }

    function onPointerMove(event) {
      pointer = { x: event.clientX, y: event.clientY }
      if (!frame) frame = requestAnimationFrame(update)
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [svgRef])
}
