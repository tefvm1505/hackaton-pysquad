import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { ROUTES } from '@/config/routes'
import { useAuth } from '@/hooks/useAuth'
import { SessionCheck } from './SessionCheck'

/**
 * Envuelve las rutas que requieren sesión.
 *
 * Solo renderiza las páginas hijas cuando la sesión está confirmada, así que
 * ninguna página protegida se monta (ni hace peticiones) antes de tiempo.
 * Sin sesión, manda al login y recuerda a dónde quería ir el usuario.
 */
export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <SessionCheck />

  if (status !== 'authenticated') {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />
  }

  return <Outlet />
}
