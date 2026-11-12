import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthLayout } from '@/components/layouts/AuthLayout'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { ProtectedRoute } from '@/components/layouts/ProtectedRoute'
import { PublicOnlyRoute } from '@/components/layouts/PublicOnlyRoute'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ROUTES } from '@/config/routes'
import { AuthProvider } from '@/context/AuthContext'
import ExceptionsPage from '@/pages/ExceptionsPage'
import InvoiceReviewPage from '@/pages/InvoiceReviewPage'
import InvoicesPage from '@/pages/InvoicesPage'
import LoginPage from '@/pages/LoginPage'
import UploadPage from '@/pages/UploadPage'

export default function App() {
  return (
    <TooltipProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Solo visitantes sin sesión */}
            <Route element={<PublicOnlyRoute />}>
              <Route element={<AuthLayout />}>
                <Route path={ROUTES.login} element={<LoginPage />} />
              </Route>
            </Route>

            {/* Todo lo demás exige sesión, incluida la ruta comodín */}
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route index element={<Navigate to={ROUTES.invoices} replace />} />
                <Route path={ROUTES.invoices} element={<InvoicesPage />} />
                <Route path={ROUTES.invoiceReview()} element={<InvoiceReviewPage />} />
                <Route path={ROUTES.upload} element={<UploadPage />} />
                <Route path={ROUTES.exceptions} element={<ExceptionsPage />} />
                <Route path="*" element={<Navigate to={ROUTES.invoices} replace />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      <Toaster richColors closeButton position="top-right" />
    </TooltipProvider>
  )
}
