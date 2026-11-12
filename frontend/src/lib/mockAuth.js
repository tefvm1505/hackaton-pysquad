/**
 * Cuenta de DEMOSTRACIÓN para desarrollar sin backend.
 *
 * Estas credenciales viajan dentro del JavaScript del navegador, así que NO
 * protegen nada: solo simulan lo que hará el backend. Se usan únicamente
 * mientras `USE_MOCK = true` en `api.js`. Antes de producción: poner
 * `USE_MOCK = false` y borrar este archivo y `mockInvoices.js`.
 */

export const DEMO_USER = {
  id: 'usr_demo',
  name: 'Contador Demo',
  email: 'demo@invoice.local',
  role: 'accountant',
}

/** Identificadores aceptados para la cuenta demo (en minúsculas). */
export const DEMO_IDENTIFIERS = [DEMO_USER.email, 'demo']

export const DEMO_PASSWORD = 'Demo2026!'
