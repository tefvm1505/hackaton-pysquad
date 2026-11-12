import { useRef } from 'react'
import { useEyeTracking } from '@/hooks/useEyeTracking'

const VIEW_W = 420
const VIEW_H = 340
const EYE_R = 15
const PUPIL_R = 7
const FOLD = 26 // tamaño de la esquina doblada
const RADIUS = 12
const INK = '#1e293b'

/**
 * Las facturas, de atrás hacia adelante (el orden define quién tapa a quién).
 *  - x, y, w, h: caja de la hoja
 *  - eyeY:       altura de los ojos, relativa a la parte superior de la hoja
 *  - mouth:      'o' | 'smile' | 'tooth', con su posición relativa `mouthY`
 *  - lines:      cuántas líneas de "texto" lleva, empezando en `linesY`
 */
const INVOICES = [
  { id: 'violet', x: 20, y: 40, w: 110, h: 280, fill: '#A78BFA', accent: '#5B21B6', eyeY: 72, mouth: 'o', mouthY: 106, lines: 3, linesY: 130 },
  { id: 'yellow', x: 120, y: 100, w: 130, h: 220, fill: '#FCD34D', accent: '#92400E', eyeY: 60, mouth: 'smile', mouthY: 92, lines: 0, linesY: 0 },
  { id: 'red', x: 250, y: 50, w: 120, h: 270, fill: '#FB7185', accent: '#9F1239', eyeY: 70, mouth: 'o', mouthY: 104, lines: 2, linesY: 124 },
  { id: 'teal', x: 60, y: 180, w: 110, h: 140, fill: '#5EEAD4', accent: '#0F766E', eyeY: 50, mouth: 'tooth', mouthY: 84, lines: 2, linesY: 104 },
  { id: 'blue', x: 165, y: 200, w: 100, h: 120, fill: '#4C9AFF', accent: '#1E40AF', eyeY: 44, mouth: 'smile', mouthY: 74, lines: 1, linesY: 94 },
  { id: 'pink', x: 270, y: 180, w: 110, h: 140, fill: '#F9A8D4', accent: '#9D174D', eyeY: 50, mouth: 'o', mouthY: 84, lines: 2, linesY: 104 },
]

/** Hoja con esquina superior derecha doblada y esquinas inferiores redondeadas. */
function sheetPath({ x, y, w, h }) {
  const r = RADIUS
  return [
    `M${x + r},${y}`,
    `H${x + w - FOLD}`,
    `L${x + w},${y + FOLD}`,
    `V${y + h - r}`,
    `Q${x + w},${y + h} ${x + w - r},${y + h}`,
    `H${x + r}`,
    `Q${x},${y + h} ${x},${y + h - r}`,
    `V${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    'Z',
  ].join(' ')
}

function Eye({ cx, cy }) {
  return (
    <g data-eye>
      <circle cx={cx} cy={cy} r={EYE_R} fill="#fff" />
      <circle
        data-pupil
        cx={cx}
        cy={cy}
        r={PUPIL_R}
        fill={INK}
        style={{ transition: 'transform 90ms ease-out' }}
      />
    </g>
  )
}

function Mouth({ type, cx, cy, accent }) {
  if (type === 'smile') {
    return (
      <path
        d={`M${cx - 10},${cy} Q${cx},${cy + 10} ${cx + 10},${cy}`}
        fill="none"
        stroke={accent}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    )
  }
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={type === 'tooth' ? 7 : 6} ry={type === 'tooth' ? 9 : 8} fill={accent} />
      {type === 'tooth' && <rect x={cx - 3} y={cy - 9} width="6" height="6" rx="1" fill="#fff" />}
    </g>
  )
}

function Invoice(sheet) {
  const { x, y, w, fill, accent, eyeY, mouth, mouthY, lines, linesY } = sheet
  const gap = Math.min(40, w * 0.42)
  const cx = x + w / 2

  return (
    <g>
      <path d={sheetPath(sheet)} fill={fill} />
      {/* Esquina doblada */}
      <path
        d={`M${x + w - FOLD},${y} V${y + FOLD} H${x + w} Z`}
        fill="#000"
        fillOpacity="0.14"
      />

      <Eye cx={cx - gap / 2} cy={y + eyeY} />
      <Eye cx={cx + gap / 2} cy={y + eyeY} />
      <Mouth type={mouth} cx={cx} cy={y + mouthY} accent={accent} />

      {/* Líneas de "texto" de la factura */}
      {Array.from({ length: lines }, (_, i) => (
        <rect
          key={i}
          x={x + 16}
          y={y + linesY + i * 14}
          width={(w - 32) * [1, 0.7, 0.5][i]}
          height="6"
          rx="3"
          fill="#fff"
          fillOpacity="0.6"
        />
      ))}
    </g>
  )
}

/**
 * Ilustración decorativa: facturas con ojos que siguen el puntero.
 * Es solo adorno, por eso se oculta a lectores de pantalla.
 */
export function InvoiceCharacters({ className }) {
  const svgRef = useRef(null)
  useEyeTracking(svgRef)

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {INVOICES.map((sheet) => (
        <Invoice key={sheet.id} {...sheet} />
      ))}
    </svg>
  )
}
