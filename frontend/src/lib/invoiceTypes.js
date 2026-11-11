/**
 * Contrato de datos de facturas (solo documentación JSDoc, no hay código).
 *
 * IMPORTANTE: es una propuesta. Cuando el backend tenga su esquema definido,
 * ajustar aquí (y en `api.js`) los nombres de campos.
 *
 * Uso en otros archivos:
 *   /** @type {import('@/lib/invoiceTypes').Invoice} *\/
 */

/**
 * Estado del ciclo de vida de una factura. Cada estado se proyecta a un color
 * de semáforo en `semaphore.js`.
 *  - validated:    pasó todas las validaciones, lista para causar
 *  - needs_review: tiene advertencias, requiere ojo humano
 *  - blocked:      tiene errores críticos
 *  - approved:     un contador la aprobó para causación
 *  - rejected:     un contador la rechazó
 * @typedef {'validated' | 'needs_review' | 'blocked' | 'approved' | 'rejected'} InvoiceStatus
 */

/** @typedef {'COP' | 'USD' | 'EUR'} Currency */

/** @typedef {'info' | 'warning' | 'error'} FindingSeverity */

/** @typedef {'purchase_order' | 'tax' | 'totals' | 'supplier' | 'duplicate'} FindingCategory */

/**
 * Hallazgo de validación producido por el backend.
 * @typedef {Object} ValidationFinding
 * @property {string} id
 * @property {FindingCategory} category
 * @property {FindingSeverity} severity
 * @property {string} title
 * @property {string} description
 * @property {string} [expected] Valor esperado según la fuente de verdad (OC, cálculo, maestro).
 * @property {string} [found] Valor encontrado en la factura.
 */

/**
 * @typedef {Object} InvoiceLine
 * @property {string} id
 * @property {string} description
 * @property {number} quantity
 * @property {number} unitPrice
 * @property {number} ivaRate Porcentaje de IVA de la línea (ej. 19).
 * @property {number} total
 */

/**
 * @typedef {Object} Invoice
 * @property {string} id
 * @property {string} invoiceNumber
 * @property {string} supplierName
 * @property {string} supplierNit
 * @property {string} issueDate yyyy-mm-dd
 * @property {string} dueDate yyyy-mm-dd
 * @property {Currency} currency
 * @property {number} subtotal
 * @property {number} ivaAmount
 * @property {number} total
 * @property {string} purchaseOrderNumber Vacío si no tiene orden de compra.
 * @property {string} receivedAt Fecha de llegada al sistema (ISO 8601).
 * @property {InvoiceStatus} status
 * @property {InvoiceLine[]} lines
 * @property {ValidationFinding[]} findings
 * @property {string} [rejectionReason] Motivo si fue rechazada.
 */

export {}
