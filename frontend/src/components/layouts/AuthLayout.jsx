import { Outlet } from 'react-router-dom'

/** Marco para las pantallas públicas (login, y más adelante registro y recuperar clave). */
export function AuthLayout() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-3 sm:p-4 md:p-8">
      <div className="w-full max-w-5xl">
        <Outlet />
      </div>
    </main>
  )
}
