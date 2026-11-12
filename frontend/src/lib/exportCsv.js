/**
 * Exportación a CSV pensada para abrirse en Excel.
 *
 * Seguridad: Excel interpreta como fórmula toda celda que empiece con = + - @ (o
 * tabulador / retorno de carro). Un dato malicioso como "=HYPERLINK(...)" ejecutaría
 * código al abrir el archivo ("CSV injection"). Por eso esas celdas se prefijan con
 * una comilla simple, que Excel muestra como texto.
 */

const FORMULA_START = /^[=+\-@\t\r]/

export function escapeCsvCell(value) {
  let text = value === null || value === undefined ? '' : String(value)
  if (FORMULA_START.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {Array<{ header: string, value: (row: any) => unknown }>} columns
 * @returns {string} Texto CSV con BOM UTF-8 (para que Excel muestre bien las tildes).
 */
export function toCsv(rows, columns) {
  const header = columns.map((c) => escapeCsvCell(c.header)).join(',')
  const lines = rows.map((row) => columns.map((c) => escapeCsvCell(c.value(row))).join(','))
  return `\uFEFF${[header, ...lines].join('\r\n')}\r\n`
}

export function downloadCsv(fileName, csvText) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  // Se libera después de iniciar la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
