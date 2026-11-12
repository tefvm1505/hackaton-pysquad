/**
 * Devuelve a dónde mandar al usuario tras iniciar sesión.
 *
 * `from` es el objeto `location` que guardó ProtectedRoute (pathname, search, hash).
 * Solo se aceptan rutas internas: el estado del historial lo puede manipular el
 * usuario, y un destino como `//sitio-malo.com` o `https://...` sería un
 * "open redirect". Ante cualquier duda se usa `fallback`.
 *
 * @param {{ pathname?: unknown, search?: unknown, hash?: unknown } | null | undefined} from
 * @param {string} fallback
 */
export function getSafeRedirect(from, fallback) {
  const pathname = from?.pathname

  const isInternalPath =
    typeof pathname === 'string' &&
    pathname.startsWith('/') &&
    !pathname.startsWith('//') &&
    !pathname.includes('\\') &&
    ![...pathname].some((char) => char.charCodeAt(0) < 32)

  if (!isInternalPath) return fallback

  const search = typeof from.search === 'string' ? from.search : ''
  const hash = typeof from.hash === 'string' ? from.hash : ''
  return `${pathname}${search}${hash}`
}
