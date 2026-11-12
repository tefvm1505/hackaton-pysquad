import { FileSearch } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Nombre de la marca: "Facto".
 *
 * Tamaños:
 *  - 'sm': menú lateral y encabezado móvil, con el ícono.
 *  - 'xl': portada del login, solo texto grande.
 *
 * El texto usa la tipografía de marca (`font-brand`, Sora) en negrita y con el
 * espaciado cerrado típico de un logotipo.
 */
const SIZES = {
  sm: { text: 'text-xl', icon: 'size-5', gap: 'gap-2' },
  xl: { text: 'text-5xl sm:text-6xl', icon: 'size-9', gap: 'gap-3' },
}

export function BrandMark({ size = 'sm', showIcon = size === 'sm', className }) {
  const s = SIZES[size]

  return (
    <span className={cn('inline-flex items-center', s.gap, className)}>
      {showIcon && <FileSearch aria-hidden className={s.icon} />}
      <span
        className={cn(
          'font-brand leading-none font-extrabold tracking-[-0.04em]',
          s.text,
        )}
      >
        Facto
      </span>
    </span>
  )
}
