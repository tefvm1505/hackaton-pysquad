/**
 * Semáforo de facturas: única fuente de la regla estado → color.
 * Colores: 'green' | 'yellow' | 'red'.
 */

/** Proyección estado → semáforo. */
export const INVOICE_STATUS = {
  validated: { label: 'Validada', light: 'green' },
  approved: { label: 'Aprobada', light: 'green' },
  needs_review: { label: 'Requiere revisión', light: 'yellow' },
  blocked: { label: 'Con errores', light: 'red' },
  rejected: { label: 'Rechazada', light: 'red' },
}

/** Orden del semáforo al ordenar: rojo primero, porque es lo más urgente. */
export const LIGHT_RANK = { red: 0, yellow: 1, green: 2 }

/** Clases Tailwind por color. Usan los tokens definidos en `index.css`. */
export const LIGHT_STYLES = {
  green: {
    badge: 'bg-success-soft text-success border-success/25',
    dot: 'bg-success',
    panel: 'border-success/30 bg-success-soft',
  },
  yellow: {
    badge: 'bg-warning-soft text-warning border-warning/25',
    dot: 'bg-warning',
    panel: 'border-warning/30 bg-warning-soft',
  },
  red: {
    badge: 'bg-danger-soft text-danger border-danger/25',
    dot: 'bg-danger',
    panel: 'border-danger/30 bg-danger-soft',
  },
}

/** Severidad de un hallazgo → etiqueta y color. */
export const SEVERITY = {
  info: { label: 'Informativo', light: 'green' },
  warning: { label: 'Advertencia', light: 'yellow' },
  error: { label: 'Error', light: 'red' },
}

export const FINDING_CATEGORY_LABELS = {
  purchase_order: 'Orden de compra',
  tax: 'IVA e impuestos',
  totals: 'Totales',
  supplier: 'Proveedor',
  duplicate: 'Duplicados',
}

/** Etapas del procesamiento donde puede ocurrir una excepción. */
export const EXCEPTION_STAGE = {
  extraction: 'Extracción',
  validation: 'Validación',
  accounting: 'Causación',
}

export const EXCEPTION_STATUS = {
  open: 'Abierta',
  resolved: 'Resuelta',
}

/** Orden de severidad: lo más grave primero. */
export const SEVERITY_RANK = { error: 0, warning: 1, info: 2 }

/** Estados en los que aún se puede aprobar o rechazar. */
export const REVIEWABLE_STATUSES = new Set(['validated', 'needs_review', 'blocked'])

/** Color de semáforo de una factura. */
export function lightOf(invoice) {
  return INVOICE_STATUS[invoice.status].light
}
