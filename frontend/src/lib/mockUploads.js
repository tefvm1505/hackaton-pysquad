import { formatCurrency } from './format'

/**
 * Simula lo que hará el backend + la IA al recibir un documento.
 * Borrar junto con la rama "mock" de `api.js` cuando exista la API real.
 *
 * Los resultados se turnan en este orden, para poder ver todos los casos en una demo:
 *   1. validated    -> todo coincide
 *   2. needs_review -> diferencias contra la orden de compra
 *   3. blocked      -> duplicado + IVA incorrecto
 *   4. unreadable   -> el documento no se pudo leer (no genera factura)
 */

const SUPPLIERS = [
  { name: 'Comercializadora Horizonte S.A.S.', nit: '900.456.789-2' },
  { name: 'Ferretería Central Ltda.', nit: '800.321.654-9' },
  { name: 'Soluciones Digitales del Norte S.A.', nit: '901.765.432-1' },
  { name: 'Distribuciones Bolívar S.A.S.', nit: '860.234.567-4' },
]
const SUBTOTALS = [4_200_000, 1_850_000, 6_400_000, 3_100_000]
const SCENARIOS = ['validated', 'needs_review', 'blocked', 'unreadable']

const pad = (n) => String(n).padStart(2, '0')
const isoDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const shortName = (name) => (name.length > 80 ? `${name.slice(0, 77)}…` : name)

function baseInvoice(n, now, { ivaRate = 0.19 } = {}) {
  const supplier = SUPPLIERS[n % SUPPLIERS.length]
  const subtotal = SUBTOTALS[n % SUBTOTALS.length]
  const ivaAmount = Math.round(subtotal * ivaRate)
  const due = new Date(now)
  due.setDate(due.getDate() + 30)
  const quantity = 10

  return {
    id: `inv_u${n + 1}`,
    invoiceNumber: `FE-${10300 + n + 1}`,
    supplierName: supplier.name,
    supplierNit: supplier.nit,
    issueDate: isoDate(now),
    dueDate: isoDate(due),
    currency: 'COP',
    subtotal,
    ivaAmount,
    total: subtotal + ivaAmount,
    purchaseOrderNumber: `OC-2026-${String(500 + n).padStart(4, '0')}`,
    receivedAt: now.toISOString(),
    lines: [
      {
        id: 'l1',
        description: 'Suministros según orden de compra',
        quantity,
        unitPrice: subtotal / quantity,
        ivaRate: Math.round(ivaRate * 100),
        total: subtotal,
      },
    ],
  }
}

function exceptionFor(n, i, invoice, now, data) {
  return {
    id: `exc_u${n + 1}_${i + 1}`,
    occurredAt: now.toISOString(),
    stage: 'validation',
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    supplierName: invoice.supplierName,
    status: 'open',
    ...data,
  }
}

/**
 * @param {number} n Número de carga en la sesión (0, 1, 2…).
 * @param {string} fileName
 * @param {Date} [now]
 * @returns {{ invoice: import('./invoiceTypes').Invoice | null,
 *             analysis: import('./invoiceTypes').AiAnalysis,
 *             exceptions: import('./invoiceTypes').ExceptionRecord[] }}
 */
export function buildUploadOutcome(n, fileName, now = new Date()) {
  const scenario = SCENARIOS[n % SCENARIOS.length]
  const money = (v) => formatCurrency(v, 'COP')

  if (scenario === 'validated') {
    const invoice = {
      ...baseInvoice(n, now),
      status: 'validated',
      findings: [],
    }
    invoice.findings = [
      {
        id: 'f1',
        category: 'purchase_order',
        severity: 'info',
        title: 'Coincide con la orden de compra',
        description: `Cantidades y valores concuerdan con ${invoice.purchaseOrderNumber}.`,
      },
      {
        id: 'f2',
        category: 'tax',
        severity: 'info',
        title: 'IVA calculado correctamente',
        description: 'El IVA del 19% coincide con la base gravable.',
        expected: money(invoice.ivaAmount),
        found: money(invoice.ivaAmount),
      },
    ]
    return {
      invoice,
      exceptions: [],
      analysis: {
        outcome: 'validated',
        summary: `Leí la factura ${invoice.invoiceNumber} de ${invoice.supplierName} por ${money(invoice.total)}. Los valores coinciden con la orden de compra ${invoice.purchaseOrderNumber}, el IVA está bien calculado y no encontré duplicados.`,
        recommendations: [
          { id: 'r1', text: 'Revisa rápidamente los datos extraídos para confirmar que son correctos.' },
          { id: 'r2', text: 'Aprueba la factura para enviarla a causación.' },
        ],
      },
    }
  }

  if (scenario === 'needs_review') {
    const invoice = { ...baseInvoice(n, now), status: 'needs_review' }
    const poSubtotal = invoice.subtotal - 300_000
    const poTotal = Math.round(poSubtotal * 1.19)
    const diff = invoice.total - poTotal
    const unit = invoice.lines[0].unitPrice
    invoice.findings = [
      {
        id: 'f1',
        category: 'purchase_order',
        severity: 'warning',
        title: 'Total distinto a la orden de compra',
        description: `El total facturado supera la orden ${invoice.purchaseOrderNumber} en ${money(diff)}.`,
        expected: money(poTotal),
        found: money(invoice.total),
      },
      {
        id: 'f2',
        category: 'purchase_order',
        severity: 'warning',
        title: 'Precio unitario mayor al pactado',
        description: 'El precio unitario facturado es mayor al de la orden de compra.',
        expected: money(unit - 30_000),
        found: money(unit),
      },
    ]
    return {
      invoice,
      exceptions: [
        exceptionFor(n, 0, invoice, now, {
          severity: 'warning',
          code: 'PO_TOTAL_MISMATCH',
          message: `El total facturado supera la orden de compra ${invoice.purchaseOrderNumber} en ${money(diff)}.`,
          details: `Total esperado ${money(poTotal)}, facturado ${money(invoice.total)}.`,
        }),
        exceptionFor(n, 1, invoice, now, {
          severity: 'warning',
          code: 'PO_PRICE_MISMATCH',
          message: 'Precio unitario distinto al de la orden de compra.',
          details: `Precio pactado ${money(unit - 30_000)}, facturado ${money(unit)}.`,
        }),
      ],
      analysis: {
        outcome: 'needs_review',
        summary: `Leí la factura ${invoice.invoiceNumber} de ${invoice.supplierName} por ${money(invoice.total)}. Encontré 2 diferencias frente a la orden de compra ${invoice.purchaseOrderNumber}: el total supera lo autorizado en ${money(diff)} porque el precio unitario es mayor al pactado.`,
        recommendations: [
          { id: 'r1', text: `Confirma con el proveedor si el mayor valor (${money(diff)}) fue autorizado.` },
          { id: 'r2', text: 'Si no lo fue, rechaza la factura y solicita una nota crédito.' },
          { id: 'r3', text: 'Si la diferencia es correcta, corrige el dato en la revisión y aprueba.' },
        ],
      },
    }
  }

  if (scenario === 'blocked') {
    const invoice = { ...baseInvoice(n, now, { ivaRate: 0.16 }), status: 'blocked' }
    const correctIva = Math.round(invoice.subtotal * 0.19)
    invoice.findings = [
      {
        id: 'f1',
        category: 'tax',
        severity: 'error',
        title: 'Tarifa de IVA no vigente',
        description: 'La factura aplica IVA del 16%. La tarifa general vigente es 19%.',
        expected: money(correctIva),
        found: money(invoice.ivaAmount),
      },
      {
        id: 'f2',
        category: 'duplicate',
        severity: 'error',
        title: 'Posible factura duplicada',
        description: 'Existe la factura FE-10190 del mismo proveedor con el mismo valor y concepto.',
        expected: 'Sin coincidencias',
        found: 'FE-10190',
      },
    ]
    return {
      invoice,
      exceptions: [
        exceptionFor(n, 0, invoice, now, {
          severity: 'error',
          code: 'TAX_RATE_INVALID',
          message: 'Tarifa de IVA no vigente: la factura aplica 16% y la tarifa general es 19%.',
          details: `IVA esperado ${money(correctIva)}, encontrado ${money(invoice.ivaAmount)}.`,
        }),
        exceptionFor(n, 1, invoice, now, {
          severity: 'error',
          code: 'DUPLICATE_INVOICE',
          message: 'Posible factura duplicada: FE-10190 del mismo proveedor, valor y concepto.',
          details: `Coincidencia por NIT ${invoice.supplierNit}, valor ${money(invoice.total)} y concepto.`,
        }),
      ],
      analysis: {
        outcome: 'blocked',
        summary: `Leí la factura ${invoice.invoiceNumber} de ${invoice.supplierName} por ${money(invoice.total)}, pero encontré 2 errores críticos: aplica IVA del 16% (la tarifa vigente es 19%) y parece duplicar la factura FE-10190.`,
        recommendations: [
          { id: 'r1', text: 'No apruebes esta factura todavía.' },
          { id: 'r2', text: 'Revisa si FE-10190 ya fue causada: si es la misma factura, recházala.' },
          { id: 'r3', text: 'Pide al proveedor una factura corregida con el IVA al 19%.' },
        ],
      },
    }
  }

  // unreadable
  return {
    invoice: null,
    exceptions: [
      {
        id: `exc_u${n + 1}_1`,
        occurredAt: now.toISOString(),
        stage: 'extraction',
        severity: 'error',
        code: 'OCR_UNREADABLE',
        message: `No se pudo extraer información de «${shortName(fileName)}».`,
        details: 'El documento parece una imagen de baja resolución. No se detectó número de factura, NIT ni totales.',
        status: 'open',
      },
    ],
    analysis: {
      outcome: 'unreadable',
      summary: `No pude leer «${shortName(fileName)}». Parece una imagen escaneada con poca resolución y no logré identificar el número de factura, el NIT ni los valores.`,
      recommendations: [
        { id: 'r1', text: 'Sube la versión original en PDF (no una foto ni un escaneo).' },
        { id: 'r2', text: 'Si el proveedor la envió por correo, usa el XML adjunto: es el formato más confiable.' },
        { id: 'r3', text: 'Si no tienes otra versión, pídesela al proveedor.' },
      ],
    },
  }
}
