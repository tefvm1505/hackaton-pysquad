import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { ROUTES } from '@/config/routes'
import { useAuth } from '@/hooks/useAuth'
import { getSafeRedirect } from '@/lib/authRedirect'
import { SessionCheck } from './SessionCheck'

/**
 * Envuelve las rutas solo para visitantes (login). Si ya hay sesión, redirige
 * a la página que el usuario quería abrir (o a facturas). Este es también el
 * punto por el que se sale del login justo después de iniciar sesión.
 */
export function PublicOnlyRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <SessionCheck />

  if (status === 'authenticated') {
    return <Navigate to={getSafeRedirect(location.state?.from, ROUTES.invoices)} replace />
  }

  return <Outlet />
}
