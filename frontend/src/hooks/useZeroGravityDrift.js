import { useEffect, useRef } from 'react'

/*
 * Parámetros de la deriva (px, segundos, radianes). El elemento se mueve a velocidad constante y
 * lo único que cambia es la dirección, de forma suave y al azar, así que nunca frena ni da tirones.
 */

/** Centro de la zona por la que deambula, relativo a su posición de reposo (0, 0). Está corrido
 * hacia arriba y a la izquierda para que no se salga por el borde de la pantalla. */
const CENTER_X = -7
const CENTER_Y = -7
/** Dentro de este radio se mueve libre; fuera, empieza a girar de vuelta hacia el centro. */
const SOFT_RADIUS = 9
/** Distancia extra en la que ese giro de vuelta llega a su máxima fuerza. */
const EDGE_RAMP = 4

/** Velocidad constante (px/s) y cuánto tarda en alcanzarla al arrancar. */
const SPEED = 8
const SPEED_LAG_S = 0.8

/** Giro al azar: intensidad (rad/s) y cada cuánto cambia de idea (s, entre MIN y MAX). */
const WANDER_TURN = 0.9
const KNOT_MIN_S = 1.2
const KNOT_MAX_S = 2.4
/** Fuerza del giro de vuelta al centro y giro máximo (rad/s), que fija lo cerradas que son las curvas. */
const STEER_GAIN = 2
const MAX_TURN = 1.3

/** Inclinación (grados) hacia el lado al que avanza, y su retraso para que no sea brusca. Al
 * volver a su sitio se endereza más rápido, para llegar derecho. */
const LEAN_DEG = 5
const LEAN_LAG_S = 0.5
const HOME_LEAN_LAG_S = 0.2

/** Vuelta a (0, 0) cuando se detiene la deriva: un resorte con tope de velocidad y de
 * aceleración, para que gire y frene con calma en lugar de volver de un tirón. */
const HOME_STIFFNESS = 5
const HOME_MAX_SPEED = 12
const HOME_MAX_ACCEL = 30

/** Paso máximo por cuadro, para que al volver de otra pestaña no pegue un salto. */
const MAX_DT = 1 / 30

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const smoothstep = (t) => t * t * (3 - 2 * t)
const randomSigned = () => Math.random() * 2 - 1
const randomKnot = () => KNOT_MIN_S + Math.random() * (KNOT_MAX_S - KNOT_MIN_S)

/**
 * Hace que un elemento flote como en gravedad cero: avanza siempre al mismo ritmo, en una
 * dirección que cambia de forma suave e impredecible, sin salirse de una zona reducida.
 *
 * - `active: false` lo lleva de vuelta a su sitio con un resorte suave (sin cortes) y lo deja ahí.
 * - `paused: true` lo deja donde esté y lo endereza; al reanudar, acelera de nuevo poco a poco.
 * - Con "reducir movimiento" no se mueve.
 *
 * Escribe `style.transform` directamente en cada cuadro (sin re-render de React) y deja de
 * pedir cuadros cuando no hay nada que mover.
 *
 * @param {React.RefObject<HTMLElement>} elementRef
 * @param {{ active: boolean, paused: boolean }} options
 */
export function useZeroGravityDrift(elementRef, { active, paused }) {
  const flags = useRef({ active, paused })
  const wake = useRef(() => {})

  useEffect(() => {
    flags.current = { active, paused }
    wake.current()
  }, [active, paused])

  useEffect(() => {
    const element = elementRef.current
    if (!element) return undefined

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    const state = {
      mode: 'home',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      heading: 0,
      speed: 0,
      rot: 0,
      // Ruido suave para el giro: se interpola de un valor al azar al siguiente.
      noiseFrom: randomSigned(),
      noiseTo: randomSigned(),
      noiseT: 0,
      noiseLen: randomKnot(),
    }

    let frame = 0
    let last = 0

    function turnNoise(dt) {
      state.noiseT += dt / state.noiseLen
      while (state.noiseT >= 1) {
        state.noiseT -= 1
        state.noiseFrom = state.noiseTo
        state.noiseTo = randomSigned()
        state.noiseLen = randomKnot()
      }
      return state.noiseFrom + (state.noiseTo - state.noiseFrom) * smoothstep(state.noiseT)
    }

    function wander(dt) {
      state.speed += (SPEED - state.speed) * (1 - Math.exp(-dt / SPEED_LAG_S))

      const dx = CENTER_X - state.x
      const dy = CENTER_Y - state.y
      const edge = smoothstep(clamp((Math.hypot(dx, dy) - SOFT_RADIUS) / EDGE_RAMP, 0, 1))
      const delta = Math.atan2(dy, dx) - state.heading
      const towardCenter = Math.atan2(Math.sin(delta), Math.cos(delta)) // entre -π y π

      const turn = clamp(turnNoise(dt) * WANDER_TURN + towardCenter * STEER_GAIN * edge, -MAX_TURN, MAX_TURN)
      state.heading += turn * dt
      state.vx = Math.cos(state.heading) * state.speed
      state.vy = Math.sin(state.heading) * state.speed
      state.x += state.vx * dt
      state.y += state.vy * dt
    }

    // Resorte con amortiguación crítica: llega a (0, 0) sin pasarse y parte de la velocidad que
    // traía. Los topes evitan que el primer impulso hacia casa sea un giro brusco.
    function goHome(dt) {
      const w = HOME_STIFFNESS
      let ax = -w * w * state.x - 2 * w * state.vx
      let ay = -w * w * state.y - 2 * w * state.vy
      const accel = Math.hypot(ax, ay)
      if (accel > HOME_MAX_ACCEL) {
        ax *= HOME_MAX_ACCEL / accel
        ay *= HOME_MAX_ACCEL / accel
      }
      state.vx += ax * dt
      state.vy += ay * dt
      const speed = Math.hypot(state.vx, state.vy)
      if (speed > HOME_MAX_SPEED) {
        state.vx *= HOME_MAX_SPEED / speed
        state.vy *= HOME_MAX_SPEED / speed
      }
      state.x += state.vx * dt
      state.y += state.vy * dt
    }

    function render() {
      element.style.transform = `translate3d(${state.x.toFixed(2)}px, ${state.y.toFixed(2)}px, 0) rotate(${state.rot.toFixed(2)}deg)`
    }

    function reset() {
      Object.assign(state, { mode: 'home', x: 0, y: 0, vx: 0, vy: 0, speed: 0, rot: 0 })
      element.style.transform = ''
    }

    function tick(now) {
      frame = 0
      const dt = last ? Math.min((now - last) / 1000, MAX_DT) : 0
      last = now

      if (flags.current.paused) {
        // Se queda donde está, pero se endereza (rápido) para que lo que se abra encima, como
        // el chat, no quede torcido. Al reanudar arranca desde velocidad cero.
        Object.assign(state, { vx: 0, vy: 0, speed: 0 })
        state.rot += (0 - state.rot) * (1 - Math.exp(-dt / HOME_LEAN_LAG_S))
        if (Math.abs(state.rot) < 0.05) state.rot = 0
        render()
        if (state.rot === 0) {
          last = 0
          return
        }
        frame = requestAnimationFrame(tick)
        return
      }

      const mode = flags.current.active ? 'wander' : 'home'
      if (mode !== state.mode) {
        if (mode === 'wander') {
          // Sigue en la dirección y velocidad que traía, para que no haya corte.
          const speed = Math.hypot(state.vx, state.vy)
          state.speed = speed
          state.heading = speed > 0.01 ? Math.atan2(state.vy, state.vx) : Math.random() * Math.PI * 2
        }
        state.mode = mode
      }

      if (mode === 'wander') wander(dt)
      else goHome(dt)

      const lean = mode === 'wander' ? (LEAN_DEG * state.vx) / SPEED : 0
      const leanLag = mode === 'wander' ? LEAN_LAG_S : HOME_LEAN_LAG_S
      state.rot += (lean - state.rot) * (1 - Math.exp(-dt / leanLag))

      const settled =
        mode === 'home' &&
        Math.hypot(state.x, state.y) < 0.05 &&
        Math.hypot(state.vx, state.vy) < 0.05 &&
        Math.abs(state.rot) < 0.05
      if (settled) {
        reset()
        last = 0
        return
      }

      render()
      frame = requestAnimationFrame(tick)
    }

    function start() {
      if (frame || reducedMotion.matches) return
      if (flags.current.paused && state.rot === 0) return
      if (!flags.current.active && state.mode === 'home' && state.x === 0 && state.y === 0) return
      last = 0
      frame = requestAnimationFrame(tick)
    }

    function onMotionPreferenceChange() {
      if (reducedMotion.matches) {
        if (frame) cancelAnimationFrame(frame)
        frame = 0
        reset()
      } else {
        start()
      }
    }

    wake.current = start
    start()
    reducedMotion.addEventListener('change', onMotionPreferenceChange)

    return () => {
      wake.current = () => {}
      reducedMotion.removeEventListener('change', onMotionPreferenceChange)
      if (frame) cancelAnimationFrame(frame)
      element.style.transform = ''
    }
  }, [elementRef])
}
