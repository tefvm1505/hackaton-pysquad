import { FileSignature, FileUp, ReceiptText, TriangleAlert } from 'lucide-react'

/** Rutas de la aplicación. Usar siempre estas constantes en vez de strings sueltos. */
export const ROUTES = {
  home: '/',
  invoices: '/facturas',
  /** Sin argumento devuelve el patrón (`:invoiceId`) para declarar la ruta. */
  invoiceReview: (invoiceId = ':invoiceId') => `/facturas/${invoiceId}/revision`,
  contracts: '/contratos',
  /** Sin argumento devuelve el patrón (`:contractId`) para declarar la ruta. */
  contractReview: (contractId = ':contractId') => `/contratos/${contractId}/revision`,
  upload: '/carga',
  exceptions: '/excepciones',
  login: '/login',
}

/** Ítems del menú lateral. */
export const NAV_ITEMS = [
  { to: ROUTES.invoices, label: 'Facturas', icon: ReceiptText },
  { to: ROUTES.contracts, label: 'Contratos', icon: FileSignature },
  { to: ROUTES.upload, label: 'Carga de documentos', icon: FileUp },
  { to: ROUTES.exceptions, label: 'Excepciones', icon: TriangleAlert },
]
