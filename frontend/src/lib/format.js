const LOCALE = 'es-CO'

export function formatCurrency(amount, currency = 'COP') {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'COP' ? 0 : 2,
  }).format(amount)
}

/**
 * Formatea fechas `yyyy-mm-dd` o ISO 8601.
 * Las fechas solo-día se interpretan en hora local para evitar el corrimiento
 * de un día que produce `new Date('2026-03-01')` (UTC) en zonas con offset negativo.
 */
export function formatDate(value) {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value)
  return new Intl.DateTimeFormat(LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}
