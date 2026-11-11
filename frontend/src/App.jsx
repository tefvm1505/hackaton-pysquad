import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ROUTES } from '@/config/routes'
import ExceptionsPage from '@/pages/ExceptionsPage'
import InvoiceReviewPage from '@/pages/InvoiceReviewPage'
import InvoicesPage from '@/pages/InvoicesPage'
import UploadPage from '@/pages/UploadPage'

export default function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route index element={<Navigate to={ROUTES.invoices} replace />} />
            <Route path={ROUTES.invoices} element={<InvoicesPage />} />
            <Route path={ROUTES.invoiceReview()} element={<InvoiceReviewPage />} />
            <Route path={ROUTES.upload} element={<UploadPage />} />
            <Route path={ROUTES.exceptions} element={<ExceptionsPage />} />
            <Route path="*" element={<Navigate to={ROUTES.invoices} replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster richColors closeButton position="top-right" />
    </TooltipProvider>
  )
}
