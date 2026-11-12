import { DEMO_IDENTIFIERS, DEMO_PASSWORD, DEMO_USER } from './mockAuth'
import { MOCK_EXCEPTIONS } from './mockExceptions'
import { MOCK_INVOICES } from './mockInvoices'
import { buildUploadOutcome } from './mockUploads'
import { MAX_FILE_BYTES } from './uploadRules'

/**
 * Acceso a datos del backend.
 *
 * Hoy todo trabaja en memoria con datos de ejemplo (`USE_MOCK = true`).
 * Para conectar el backend real:
 *   1. Poner `USE_MOCK = false`.
 *   2. Reemplazar el cuerpo de cada función de facturas por una llamada a `apiFetch`.
 *   3. Mantener las firmas: ningún componente debería necesitar cambios.
 *
 * La URL base se configura con `VITE_API_URL` (ver `.env.example`).
 */

const USE_MOCK = true
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * Función a llamar cuando el backend responde 401 (sesión vencida o inválida).
 * La registra AuthProvider para sacar al usuario de la app.
 */
let unauthorizedHandler = null

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler
}

/**
 * Cliente HTTP mínimo (JSON). Lanza `ApiError` si la respuesta no es 2xx.
 *
 * `credentials: 'include'` hace que el navegador envíe la cookie de sesión.
 * Si el backend está en otro origen debe responder con CORS explícito
 * (`Access-Control-Allow-Origin` con el origen exacto, no `*`, y
 * `Access-Control-Allow-Credentials: true`). Con el proxy de Vite no hace falta.
 */
export async function apiFetch(path, init = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })

  if (response.status === 401) unauthorizedHandler?.()

  if (!response.ok) {
    throw new ApiError(`Error ${response.status} al llamar ${path}`, response.status)
  }

  return response.status === 204 ? undefined : response.json()
}

const LATENCY_MS = 350
const delay = (ms = LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms))

/* -------------------------------------------------------------------------- */
/* Sesión                                                                      */
/* -------------------------------------------------------------------------- */

/*
 * Contrato propuesto para el backend (coordinar con quien lo construye):
 *
 *   POST /auth/login   { identifier, password, remember }
 *        200 -> { user }  y el servidor fija una cookie de sesión HttpOnly + Secure + SameSite
 *        401 -> credenciales incorrectas (mismo mensaje para usuario y clave)
 *   GET  /auth/me      200 -> { user }   |   401 si no hay sesión válida
 *   POST /auth/logout  204, invalida la sesión en el servidor
 *
 * `user` = { id, name, email, role }. El frontend NO guarda tokens: la sesión vive
 * en la cookie HttpOnly, que el JavaScript de la página no puede leer (protege
 * contra el robo del token por XSS). Para saber si hay sesión se pregunta a /auth/me.
 *
 * Además, CADA endpoint de facturas debe exigir sesión y responder 401 si no la hay:
 * esa es la verdadera barrera. Las rutas protegidas del frontend son solo comodidad.
 */

// MOCK: la "sesión" demo dura lo que dure la pestaña. No es segura, solo simula al backend.
const MOCK_SESSION_KEY = 'facto:mock-session'

function readMockSession() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(MOCK_SESSION_KEY))
    return stored?.id === DEMO_USER.id ? DEMO_USER : null
  } catch {
    return null
  }
}

/** MOCK: hace que los datos exijan sesión, como lo hará el backend real. */
function requireMockSession() {
  if (!readMockSession()) {
    unauthorizedHandler?.()
    throw new ApiError('Sesión no válida', 401)
  }
}

/**
 * Inicia sesión. Lanza `ApiError` con status 401 si las credenciales no son correctas.
 * @param {{ identifier: string, password: string, remember: boolean }} credentials
 * @returns {Promise<{ id: string, name: string, email: string, role: string }>}
 */
export async function login({ identifier, password, remember }) {
  if (USE_MOCK) {
    await delay()
    const normalized = identifier.trim().toLowerCase()
    const valid = DEMO_IDENTIFIERS.includes(normalized) && password === DEMO_PASSWORD
    // Mismo mensaje para usuario y clave incorrectos: no revela cuál falló.
    if (!valid) throw new ApiError('Credenciales incorrectas', 401)
    sessionStorage.setItem(MOCK_SESSION_KEY, JSON.stringify({ id: DEMO_USER.id }))
    return DEMO_USER
  }

  const { user } = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password, remember }),
  })
  return user
}

/**
 * Devuelve el usuario con sesión activa o `null` si no hay.
 * Cualquier otro error (red caída, 500) se propaga: quien llama debe tratarlo
 * como "sin sesión" (falla cerrado).
 */
export async function getSession() {
  if (USE_MOCK) {
    await delay(120)
    return readMockSession()
  }

  try {
    const { user } = await apiFetch('/auth/me')
    return user
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

export async function logout() {
  if (USE_MOCK) {
    sessionStorage.removeItem(MOCK_SESSION_KEY)
    return
  }
  await apiFetch('/auth/logout', { method: 'POST' })
}

/* -------------------------------------------------------------------------- */
/* Facturas                                                                    */
/* -------------------------------------------------------------------------- */

// Copia en memoria para que aprobar/rechazar se refleje en el listado.
const store = new Map(structuredClone(MOCK_INVOICES).map((invoice) => [invoice.id, invoice]))

function assertMock() {
  if (!USE_MOCK) {
    throw new Error('API real no implementada todavía')
  }
  requireMockSession()
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

/* -------------------------------------------------------------------------- */
/* Carga de documentos                                                         */
/* -------------------------------------------------------------------------- */

/*
 * Contrato propuesto para el backend:
 *
 *   POST /invoices/upload   (multipart/form-data, campo "file")
 *     -> 202 { jobId }  y el avance se consulta con GET /invoices/upload/:jobId
 *        (o por SSE/WebSocket): { stage, progress } y al final { analysis, invoice? }
 *   El backend debe validar tipo real, tamaño y analizar con antivirus; la validación del
 *   navegador (uploadRules.js) es solo comodidad. `analysis` lo redacta la IA.
 */

// MOCK: la n-ésima carga de la sesión sigue un escenario distinto (ver mockUploads.js).
let uploadCounter = 0

const exceptionStore = new Map(structuredClone(MOCK_EXCEPTIONS).map((e) => [e.id, e]))

/**
 * Sube un documento y devuelve el análisis de la IA.
 *
 * @param {File} file
 * @param {{ onProgress?: (percent: number) => void,
 *           onStage?: (stage: 'upload' | 'read' | 'validate' | 'check') => void }} [hooks]
 * @returns {Promise<import('./invoiceTypes').UploadResult>}
 */
export async function uploadInvoice(file, { onProgress, onStage } = {}) {
  assertMock()
  if (file.size > MAX_FILE_BYTES) {
    throw new ApiError('El archivo supera el tamaño permitido', 413)
  }

  const n = uploadCounter++

  onStage?.('upload')
  for (let percent = 0; percent <= 100; percent += 20) {
    onProgress?.(percent)
    await delay(180)
  }

  for (const stage of ['read', 'validate', 'check']) {
    onStage?.(stage)
    await delay(700)
  }

  const { invoice, analysis, exceptions } = buildUploadOutcome(n, file.name)
  if (invoice) store.set(invoice.id, invoice)
  for (const exception of exceptions) exceptionStore.set(exception.id, exception)

  return structuredClone({ analysis, ...(invoice ? { invoice } : {}) })
}

/* -------------------------------------------------------------------------- */
/* Log de excepciones                                                          */
/* -------------------------------------------------------------------------- */

/** Más recientes primero. @returns {Promise<import('./invoiceTypes').ExceptionRecord[]>} */
export async function listExceptions() {
  assertMock()
  await delay()
  const all = [...exceptionStore.values()].sort(
    (a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt),
  )
  return structuredClone(all)
}

/**
 * Marca una excepción como resuelta, dejando constancia de quién y por qué.
 * "Quién" lo decide el servidor a partir de la sesión: el cliente nunca lo envía,
 * porque podría falsificarse.
 *
 * @returns {Promise<import('./invoiceTypes').ExceptionRecord>}
 */
export async function resolveException(id, note) {
  assertMock()
  await delay()
  const current = exceptionStore.get(id)
  if (!current) throw new Error('La excepción no existe')
  if (current.status === 'resolved') throw new Error('La excepción ya estaba resuelta')

  const updated = {
    ...current,
    status: 'resolved',
    resolution: { note, by: DEMO_USER.name, at: new Date().toISOString() },
  }
  exceptionStore.set(id, updated)
  return structuredClone(updated)
}
