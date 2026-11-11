# Invoice Processor — Frontend

SPA de backoffice para revisar, validar y aprobar facturas antes de su causación contable.

**Stack:** Vite · React 19 (JSX) · Tailwind CSS v4 · shadcn/ui (Radix) · lucide-react · Sonner · React Hook Form + Zod · TanStack Table v9 · React Router

## Comandos

```bash
npm install
npm run dev       # http://localhost:5173
npm run build
npm run lint
```

## Estructura

Organizada por tipo de archivo, igual que el resto de proyectos del equipo.

```
src/
├── components/
│   ├── ui/               shadcn/ui (minúsculas con guion: button.jsx, dropdown-menu.jsx)
│   ├── layouts/          DashboardLayout, PageHeader, PagePlaceholder
│   ├── invoices/         InvoicesTable, InvoiceStatusBadge, InvoiceRowActions
│   └── review/           ExtractedDataForm, ValidationFindings, InvoiceLinesTable,
│                         RejectDialog, ConfirmApproveDialog
├── pages/                Una por ruta, export default: InvoicesPage, InvoiceReviewPage,
│                         UploadPage, ExceptionsPage
├── config/routes.js      ROUTES (rutas) y NAV_ITEMS (menú lateral)
├── hooks/                useAsync
├── lib/
│   ├── api.js            apiFetch + funciones de facturas (hoy con datos de ejemplo)
│   ├── mockInvoices.js   datos de ejemplo
│   ├── invoiceTypes.js   contrato de datos en JSDoc (solo documentación)
│   ├── invoiceSchemas.js esquemas Zod de los formularios
│   ├── semaphore.js      regla estado → color y etiquetas
│   ├── format.js         moneda y fecha (es-CO)
│   └── utils.js          cn()
├── App.jsx               Router, TooltipProvider y Toaster
└── main.jsx
```

Convenciones: componentes propios en PascalCase, componentes shadcn en minúsculas con guion,
hooks como `useX.js`, páginas terminadas en `Page`. Usar siempre `ROUTES` para enlaces y
navegación, nunca strings sueltos.

## Conectar el backend

Todo el acceso a datos pasa por `src/lib/api.js`, que hoy devuelve datos de ejemplo
(`mockInvoices.js`) con latencia simulada.

1. Copiar `.env.example` a `.env.local` y poner `VITE_API_URL`.
2. En `api.js`, poner `USE_MOCK = false` y reemplazar el cuerpo de cada función por
   `apiFetch(...)`. Mantener las firmas.
3. Ajustar `lib/invoiceTypes.js` y los datos de `mockInvoices.js` al contrato real.

Si el backend está en otro origen y no tiene CORS, usar el `proxy` comentado en `vite.config.js`.

## Decisiones a tener en cuenta

- **Semáforo:** la regla estado → color vive solo en `lib/semaphore.js`. El color siempre
  va acompañado de texto.
- **Aprobar con errores críticos** exige una segunda confirmación; **rechazar** exige un
  motivo de al menos 10 caracteres.
- **Validación de montos:** `total = subtotal + IVA` con tolerancia de 1 unidad de moneda
  (`lib/invoiceSchemas.js`). Ajustar si contabilidad define otra tolerancia.
- **JavaScript, sin tipos.** Zod valida los formularios al ejecutar. El contrato de datos
  está documentado en `invoiceTypes.js`; no hay chequeo de tipos al compilar.
- **TanStack Table v9** (API nueva): `useTable` + `tableFeatures`, no `useReactTable`.
  Las guías están en `node_modules/@tanstack/react-table/skills/`.
- **shadcn:** estilo `radix-nova` en modo JS (`"tsx": false`). `index.css` importa
  `shadcn/tailwind.css`, necesario para variantes como `data-active:` y `data-open:`.
- **Si vuelves a ejecutar `npx shadcn add ... --overwrite`:** el CLI deja `from "cn"` en
  los imports e instala los paquetes `cn` y `next-themes`, que no se usan. Cambiar el
  import a `@/lib/utils`, desinstalar esos paquetes y no usar `useTheme` en `sonner.jsx`.
- `components.json` y `.oxlintrc.json` no se pudieron reescribir con `$schema` (el editor lo
  bloquea en modo Supervised). Es solo ayuda de autocompletado.

## Pendiente

- Carga de documentos (zona de arrastre, validación de tipo/tamaño, progreso).
- Log de excepciones (tabla con filtros).
- Visor del PDF original en la pestaña "Documento" (requiere URL del backend).
- Autenticación y roles (`AuthLayout`, `ProtectedRoute`, `context/`).
- Reemplazar `useAsync` por TanStack Query si se necesita caché o invalidación.
