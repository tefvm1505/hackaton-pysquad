import { MOCK_INVOICES } from './mockInvoices'

/**
 * Acceso a datos del backend.
 *
 * Hoy las funciones de facturas trabajan en memoria con datos de ejemplo.
 * Para conectar el backend real:
 *   1. Poner `USE_MOCK = false`.
 *   2. Reemplazar el cuerpo de cada función por una llamada a `apiFetch`.
 *   3. Mantener las firmas: ningún componente debería necesitar cambios.
 *
 * La URL base se configura con `VITE_API_URL` (ver `.env.example`).
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** Cliente HTTP mínimo (JSON). Lanza `ApiError` si la respuesta no es 2xx. */
export async function apiFetch(path, init = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })

  if (!response.ok) {
    throw new ApiError(`Error ${response.status} al llamar ${path}`, response.status)
  }

  return response.status === 204 ? undefined : response.json()
}

/* -------------------------------------------------------------------------- */
/* Facturas                                                                    */
/* -------------------------------------------------------------------------- */

const USE_MOCK = true
const LATENCY_MS = 350

// Copia en memoria para que aprobar/rechazar se refleje en el listado.
const store = new Map(structuredClone(MOCK_INVOICES).map((invoice) => [invoice.id, invoice]))

const delay = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS))

function assertMock() {
  if (!USE_MOCK) {
    throw new Error('API real no implementada todavía')
  }
}

/** @returns {Promise<import('./invoiceTypes').Invoice[]>} */
export async function listInvoices() {
  assertMock()
  await delay()
  return structuredClone([...store.values()])
}

/** @returns {Promise<import('./invoiceTypes').Invoice | null>} */
export async function getInvoice(id) {
  assertMock()
  await delay()
  const invoice = store.get(id)
  return invoice ? structuredClone(invoice) : null
}

/**
 * Aprueba la factura enviando los datos (posiblemente corregidos) a causación.
 * @param {string} id
 * @param {Object} data Valores del formulario validados por `invoiceFormSchema`.
 * @returns {Promise<import('./invoiceTypes').Invoice>}
 */
export async function approveInvoice(id, data) {
  assertMock()
  await delay()
  const current = store.get(id)
  if (!current) throw new Error('La factura no existe')
  const updated = { ...current, ...data, status: 'approved' }
  store.set(id, updated)
  return structuredClone(updated)
}

/** @returns {Promise<import('./invoiceTypes').Invoice>} */
export async function rejectInvoice(id, reason) {
  assertMock()
  await delay()
  const current = store.get(id)
  if (!current) throw new Error('La factura no existe')
  const updated = { ...current, status: 'rejected', rejectionReason: reason }
  store.set(id, updated)
  return structuredClone(updated)
}
