/**
 * Cálculos sobre contratos. Son funciones puras (sin React ni red) para poder probarlas
 * con fechas fijas: las que dependen de "hoy" reciben `now` como parámetro.
 */

/** Descompone `yyyy-mm-dd` en una fecha LOCAL (evita el corrimiento de un día de `new Date('yyyy-mm-dd')`, que es UTC). */
function parseLocalDate(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** IVA del contrato (sobre el valor sin IVA). */
export function ivaAmount(contract) {
  return Math.round((contract.amount * contract.ivaRate) / 100)
}

/** Valor total con IVA. */
export function totalWithIva(contract) {
  return contract.amount + ivaAmount(contract)
}

/** Porcentaje del contrato ya facturado (puede pasar de 100). */
export function executedPercent(contract) {
  return contract.amount > 0 ? (contract.billedToDate / contract.amount) * 100 : 0
}

/** Lo que falta por facturar; negativo si ya se facturó de más. */
export function remainingAmount(contract) {
  return contract.amount - contract.billedToDate
}

/**
 * Días desde hoy hasta una fecha. Negativo si ya pasó, 0 si es hoy.
 * @param {string} date yyyy-mm-dd
 * @param {Date} [now]
 */
export function daysUntil(date, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((parseLocalDate(date) - today) / 86_400_000)
}

const EXPIRING_SOON_DAYS = 60
const HIGH_EXECUTION_PERCENT = 90

/**
 * Puntos que conviene mirar al revisar un contrato, del más grave al menos grave.
 * `severity` usa el mismo vocabulario que los hallazgos de las facturas.
 *
 * @param {import('./invoiceTypes').Contract} contract
 * @param {(value: number) => string} money Formateador de montos.
 * @param {Date} [now]
 * @returns {Array<{ id: string, severity: 'error' | 'warning' | 'info', text: string }>}
 */
export function getContractAlerts(contract, money, now = new Date()) {
  const alerts = []
  const executed = executedPercent(contract)
  const days = daysUntil(contract.endDate, now)

  if (contract.billedToDate > contract.amount) {
    alerts.push({
      id: 'overbilled',
      severity: 'error',
      text: `Lo facturado (${money(contract.billedToDate)}) supera el valor del contrato (${money(contract.amount)}).`,
    })
  } else if (executed >= HIGH_EXECUTION_PERCENT) {
    alerts.push({
      id: 'high-execution',
      severity: 'warning',
      text: `Ya se ejecutó el ${Math.floor(executed)}% del valor del contrato.`,
    })
  }

  if (days < 0) {
    alerts.push({
      id: 'expired',
      severity: contract.status === 'validated' ? 'info' : 'warning',
      text: `El contrato venció hace ${-days} ${-days === 1 ? 'día' : 'días'}.`,
    })
  } else if (days <= EXPIRING_SOON_DAYS) {
    alerts.push({
      id: 'expiring',
      severity: 'warning',
      text: days === 0 ? 'El contrato vence hoy.' : `El contrato vence en ${days} ${days === 1 ? 'día' : 'días'}.`,
    })
  }

  if (contract.ivaRate === 0) {
    alerts.push({
      id: 'iva-zero',
      severity: 'info',
      text: 'El contrato no cobra IVA. Confirma que corresponde (bien o servicio excluido o exento).',
    })
  }

  const order = { error: 0, warning: 1, info: 2 }
  return alerts.sort((a, b) => order[a.severity] - order[b.severity])
}

/** Nombres legibles de los campos, para mostrar qué se corrigió. */
export const CONTRACT_FIELD_LABELS = {
  contractNumber: 'Número de contrato',
  counterpartyName: 'Contraparte',
  counterpartyNit: 'NIT',
  type: 'Tipo',
  object: 'Objeto',
  currency: 'Moneda',
  amount: 'Valor del contrato',
  ivaRate: 'IVA',
  billingFrequency: 'Periodicidad de cobro',
  startDate: 'Fecha de inicio',
  endDate: 'Fecha de fin',
  paymentTermsDays: 'Plazo de pago',
  costCenter: 'Centro de costos',
}

/** Campos cuyo valor cambió entre el contrato original y lo que envió el formulario. */
export function changedFields(original, edited) {
  return Object.keys(CONTRACT_FIELD_LABELS).filter((key) => original[key] !== edited[key])
}
