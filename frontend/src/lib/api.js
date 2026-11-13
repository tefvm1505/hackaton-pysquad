import { changedFields } from './contracts'
import { DEMO_IDENTIFIERS, DEMO_PASSWORD, DEMO_USER } from './mockAuth'
import { MOCK_CONTRACTS } from './mockContracts'
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

const USE_MOCK = false
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

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
  const token = sessionStorage.getItem('facto:token')
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

const SESSION_TOKEN_KEY = 'facto:token'
const SESSION_USER_KEY = 'facto:user'

/**
 * Decodifica el payload de un JWT (sin verificar firma, eso lo hace el backend).
 */
function decodeTokenPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

/**
 * Inicia sesión contra el backend.
 * Envía { cedula: number, contraseña: string } a POST /login.
 * El backend devuelve un token JWT directamente (string).
 * Lo guardamos en sessionStorage.
 *
 * @param {{ cedula: string, contraseña: string }} credentials
 * @returns {Promise<{ id: string, rol: string }>}
 */
export async function login({ cedula, contraseña }) {
  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cedula: Number(cedula), contraseña }),
  })

  if (!response.ok) {
    const status = response.status
    throw new ApiError(
      status === 401 ? 'Contraseña incorrecta' : status === 404 ? 'Usuario no encontrado' : 'Error al iniciar sesión',
      status,
    )
  }

  // El backend retorna el token como string JSON (ej: "eyJ...")
  const token = await response.json()
  sessionStorage.setItem(SESSION_TOKEN_KEY, token)

  // Extraemos info del usuario desde el payload del token
  const payload = decodeTokenPayload(token)
  const user = { id: payload?.sub ?? cedula, rol: payload?.rol ?? 'user' }
  sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user))

  return user
}

/**
 * Devuelve el usuario con sesión activa o `null` si no hay token guardado o ya expiró.
 */
export async function getSession() {
  const token = sessionStorage.getItem(SESSION_TOKEN_KEY)
  if (!token) return null

  const payload = decodeTokenPayload(token)
  if (!payload) return null

  // Verificar si el token ha expirado
  const now = Math.floor(Date.now() / 1000)
  if (payload.exp && payload.exp < now) {
    sessionStorage.removeItem(SESSION_TOKEN_KEY)
    sessionStorage.removeItem(SESSION_USER_KEY)
    return null
  }

  const storedUser = sessionStorage.getItem(SESSION_USER_KEY)
  return storedUser ? JSON.parse(storedUser) : { id: payload.sub, rol: payload.rol }
}

export async function logout() {
  sessionStorage.removeItem(SESSION_TOKEN_KEY)
  sessionStorage.removeItem(SESSION_USER_KEY)
}

/* -------------------------------------------------------------------------- */
/* Facturas                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Mapea el estado que viene del backend al estado que entiende el semáforo del frontend.
 * Backend puede devolver: "sin causación", "pendiente", "aprobada", "rechazada", "con errores", etc.
 */
const STATUS_MAP = {
  'aprobada': 'approved',
  'aprobado': 'approved',
  'validada': 'validated',
  'validado': 'validated',
  'pendiente': 'needs_review',
  'requiere revision': 'needs_review',
  'requiere revisión': 'needs_review',
  'sin causación': 'needs_review',
  'sin causacion': 'needs_review',
  'rechazada': 'rejected',
  'rechazado': 'rejected',
  'con errores': 'blocked',
  'error': 'blocked',
}

function mapBackendStatus(estado) {
  if (!estado) return 'needs_review'
  return STATUS_MAP[estado.toLowerCase().trim()] ?? 'needs_review'
}

/**
 * Transforma una factura del backend al formato que espera la tabla del frontend.
 */
function mapInvoice(raw) {
  return {
    id: raw.cufe,
    invoiceNumber: raw.numero_factura,
    supplierName: raw.emisor,
    supplierNit: raw.nit_emisor,
    purchaseOrderNumber: raw.orden_compra,
    issueDate: raw.fecha_emision,
    dueDate: raw.fecha_vencimiento,
    total: Number(raw.total_pagar),
    subtotal: Number(raw.subtotal),
    tax: Number(raw.iva),
    currency: raw.moneda ?? 'COP',
    status: mapBackendStatus(raw.estado),
    contractId: raw.id_contrato,
    clientName: raw.cliente,
    clientNit: raw.nit_cliente,
    findings: [],
  }
}

/** @returns {Promise<import('./invoiceTypes').Invoice[]>} */
export async function listInvoices() {
  const rawList = await apiFetch('/facturas')
  return rawList.map(mapInvoice)
}

/**
 * Trae una factura individual por su CUFE.
 * Busca la factura en el listado general y además trae sus causaciones.
 * @returns {Promise<Object | null>}
 */
export async function getInvoice(id) {
  // Traemos todas las facturas y filtramos por el cufe (id)
  const [allInvoices, causaciones] = await Promise.all([
    apiFetch('/facturas'),
    apiFetch(`/causaciones/factura/${encodeURIComponent(id)}`).catch(() => []),
  ])

  const raw = allInvoices.find((f) => f.cufe === id)
  if (!raw) return null

  const invoice = mapInvoice(raw)

  // Adjuntamos las causaciones mapeadas
  invoice.causaciones = causaciones.map((c) => ({
    id: c.id,
    invoiceId: c.id_factura,
    contractId: c.id_contrato,
    estado: c.estado,
    sugerencia: c.sugerencia,
    fechaCausacion: c.fecha_causacion,
  }))

  // Usamos ivaAmount como alias de tax para el formulario
  invoice.ivaAmount = invoice.tax

  return invoice
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
/* Causaciones (sección Excepciones)                                           */
/* -------------------------------------------------------------------------- */

/**
 * Trae todas las causaciones del backend.
 * Más recientes primero.
 */
export async function listCausaciones() {
  const rawList = await apiFetch('/causaciones')
  return rawList
    .map((c) => ({
      id: c.id,
      invoiceId: c.id_factura,
      contractId: c.id_contrato,
      estado: c.estado,
      sugerencia: c.sugerencia,
      fechaCausacion: c.fecha_causacion,
    }))
    .sort((a, b) => Date.parse(b.fechaCausacion) - Date.parse(a.fechaCausacion))
}

/* -------------------------------------------------------------------------- */
/* Contratos                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Mapea el estado del contrato del backend al estado del frontend.
 */
const CONTRACT_STATUS_MAP = {
  'activo': 'pending_review',
  'pendiente': 'pending_review',
  'validado': 'validated',
  'validada': 'validated',
  'observado': 'observed',
  'observada': 'observed',
  'con observaciones': 'observed',
  'inactivo': 'validated',
}

function mapContractStatus(estado) {
  if (!estado) return 'pending_review'
  return CONTRACT_STATUS_MAP[estado.toLowerCase().trim()] ?? 'pending_review'
}

/**
 * Mapea la frecuencia del backend a la clave que usa el frontend.
 */
const FREQUENCY_MAP = {
  'mensual': 'monthly',
  'trimestral': 'quarterly',
  'anual': 'annual',
  'pago único': 'one_time',
  'unico': 'one_time',
}

function mapFrequency(frecuencia) {
  if (!frecuencia) return 'monthly'
  return FREQUENCY_MAP[frecuencia.toLowerCase().trim()] ?? 'monthly'
}

/**
 * Transforma un contrato del backend al formato que espera la tabla del frontend.
 */
function mapContract(raw) {
  return {
    id: raw.id_contrato,
    contractNumber: raw.id_contrato,
    counterpartyName: raw.proveedor_id,
    counterpartyNit: raw.proveedor_nit,
    object: raw.objeto,
    type: 'service',
    amount: Number(raw.valor_total),
    periodAmount: raw.valor_periodo ? Number(raw.valor_periodo) : null,
    currency: 'COP',
    billingFrequency: mapFrequency(raw.frecuencia),
    startDate: raw.vigencia_inicio,
    endDate: raw.vigencia_fin,
    costCenter: raw.centro_costo,
    status: raw.estado || 'activo',
  }
}

/** @returns {Promise<import('./invoiceTypes').Contract[]>} */
export async function listContracts() {
  const rawList = await apiFetch('/contratos')
  return rawList.map(mapContract)
}

/**
 * Trae un contrato individual por su id_contrato.
 * @returns {Promise<Object | null>}
 */
export async function getContract(id) {
  const rawList = await apiFetch('/contratos')
  const raw = rawList.find((c) => c.id_contrato === id)
  if (!raw) return null
  return mapContract(raw)
}

/**
 * Valida el contrato tras la revisión manual de detalles, montos y tipo. Si la persona corrigió
 * algún dato, se guarda el valor corregido y queda anotado qué campos cambió.
 *
 * @param {string} id
 * @param {Object} values Valores del formulario (ya validados por `contractFormSchema`), con `reviewed`.
 * @returns {Promise<import('./invoiceTypes').Contract>}
 */
export async function validateContract(id, values) {
  assertMock()
  await delay()
  const current = contractStore.get(id)
  if (!current) throw new Error('El contrato no existe')
  if (current.status === 'validated') throw new Error('El contrato ya fue validado')

  const { reviewed, ...fields } = values
  if (!reviewed?.details || !reviewed?.amounts || !reviewed?.type) {
    throw new Error('Faltan revisiones por confirmar')
  }

  const updated = {
    ...current,
    ...fields,
    status: 'validated',
    validation: {
      by: DEMO_USER.name,
      at: new Date().toISOString(),
      reviewed: { details: true, amounts: true, type: true },
      corrections: changedFields(current, { ...current, ...fields }),
    },
  }
  delete updated.observation
  contractStore.set(id, updated)
  return structuredClone(updated)
}

/** Marca el contrato como observado, con el motivo para quien debe corregirlo. */
export async function observeContract(id, note) {
  assertMock()
  await delay()
  const current = contractStore.get(id)
  if (!current) throw new Error('El contrato no existe')
  if (current.status === 'validated') throw new Error('El contrato ya fue validado')

  const updated = {
    ...current,
    status: 'observed',
    observation: { by: DEMO_USER.name, at: new Date().toISOString(), note },
  }
  contractStore.set(id, updated)
  return structuredClone(updated)
}
