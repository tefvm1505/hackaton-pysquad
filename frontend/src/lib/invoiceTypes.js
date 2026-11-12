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

/* -------------------------------------------------------------------------- */
/* Carga de documentos + asistente de IA                                       */
/* -------------------------------------------------------------------------- */

/**
 * Qué concluyó el análisis de un documento.
 *  - validated / needs_review / blocked: se pudo leer y generó una factura
 *  - unreadable: no se pudo leer; no genera factura
 * @typedef {'validated' | 'needs_review' | 'blocked' | 'unreadable'} AnalysisOutcome
 */

/**
 * Paso concreto que el asistente recomienda al usuario.
 * @typedef {Object} AiRecommendation
 * @property {string} id
 * @property {string} text
 */

/**
 * Respuesta del asistente de IA tras analizar un documento. El backend la genera;
 * el frontend solo la muestra. Texto en español, claro y sin jerga técnica.
 * @typedef {Object} AiAnalysis
 * @property {AnalysisOutcome} outcome
 * @property {string} summary Qué entendió y qué encontró, en un párrafo.
 * @property {AiRecommendation[]} recommendations Guía de qué hacer ahora, en orden.
 */

/**
 * Resultado de subir un documento.
 * @typedef {Object} UploadResult
 * @property {AiAnalysis} analysis
 * @property {Invoice} [invoice] Ausente si el documento no se pudo leer.
 */

/**
 * Etapa del procesamiento en la que ocurrió una excepción.
 *  - extraction: lectura del documento (OCR / XML)
 *  - validation: reglas de negocio (OC, IVA, duplicados, proveedor)
 *  - accounting: envío a causación en el ERP
 * @typedef {'extraction' | 'validation' | 'accounting'} ExceptionStage
 */

/** @typedef {'open' | 'resolved'} ExceptionStatus */

/**
 * Registro del log de excepciones (para auditoría).
 * @typedef {Object} ExceptionRecord
 * @property {string} id
 * @property {string} occurredAt ISO 8601
 * @property {ExceptionStage} stage
 * @property {FindingSeverity} severity
 * @property {string} code Código estable, p. ej. DUPLICATE_INVOICE
 * @property {string} message Qué pasó, en lenguaje claro.
 * @property {string} [details] Detalle técnico o de contexto.
 * @property {string} [invoiceId] Ausente si no se llegó a crear la factura.
 * @property {string} [invoiceNumber]
 * @property {string} [supplierName]
 * @property {ExceptionStatus} status
 * @property {{ note: string, by: string, at: string }} [resolution] Quién la resolvió y por qué.
 */

export {}
