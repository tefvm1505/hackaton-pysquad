import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSession, login, logout, setUnauthorizedHandler } from '@/lib/api'
import { AuthContext } from './auth'

const SIGNED_OUT = { status: 'unauthenticated', user: null }

/**
 * Mantiene el estado de sesión de toda la app.
 *
 * Reglas de seguridad:
 *  - Arranca en 'loading' y NO asume que hay sesión: la confirma el backend.
 *  - Falla cerrado: cualquier error al consultar la sesión cuenta como "sin sesión".
 *  - Si cualquier petición recibe 401, la sesión se descarta de inmediato.
 *  - No guarda contraseñas ni tokens en el navegador.
 */
export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null })

  useEffect(() => {
    let cancelled = false

    setUnauthorizedHandler(() => setState(SIGNED_OUT))

    getSession()
      .then((user) => {
        if (cancelled) return
        setState(user ? { status: 'authenticated', user } : SIGNED_OUT)
      })
      .catch(() => {
        if (!cancelled) setState(SIGNED_OUT)
      })

    return () => {
      cancelled = true
      setUnauthorizedHandler(null)
    }
  }, [])

  const signIn = useCallback(async (credentials) => {
    const user = await login(credentials)
    setState({ status: 'authenticated', user })
    return user
  }, [])

  const signOut = useCallback(async () => {
    try {
      await logout()
    } catch {
      // Aunque el servidor no responda, la interfaz debe quedar sin sesión.
    } finally {
      setState(SIGNED_OUT)
    }
  }, [])

  const value = useMemo(() => ({ ...state, signIn, signOut }), [state, signIn, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
