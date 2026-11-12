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
│   │                     + checkbox.jsx y password-input.jsx escritos a mano
│   ├── layouts/          DashboardLayout, AuthLayout, ProtectedRoute, PublicOnlyRoute,
│   │                     SessionCheck, PageHeader, PagePlaceholder
│   ├── auth/             InvoiceCharacters (facturas con ojos del login)
│   ├── invoices/         InvoicesTable, InvoiceCard, InvoiceStatusBadge, InvoiceRowActions
│   └── review/           ExtractedDataForm, ValidationFindings, InvoiceLinesTable,
│                         RejectDialog, ConfirmApproveDialog
├── pages/                Una por ruta, export default: LoginPage, InvoicesPage,
│                         InvoiceReviewPage, UploadPage, ExceptionsPage
├── config/routes.js      ROUTES (rutas) y NAV_ITEMS (menú lateral)
├── context/              AuthContext (estado de sesión), auth.js (el contexto)
├── hooks/                useAsync, useAuth, useEyeTracking
├── lib/
│   ├── api.js            apiFetch + funciones de facturas (hoy con datos de ejemplo)
│   ├── mockInvoices.js   datos de ejemplo
│   ├── invoiceTypes.js   contrato de datos en JSDoc (solo documentación)
│   ├── invoiceSchemas.js esquemas Zod de los formularios de facturas
│   ├── authSchemas.js    esquema Zod del login
│   ├── authRedirect.js   destino seguro tras el login (evita open redirect)
│   ├── mockAuth.js       cuenta demo (borrar antes de producción)
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

## Seguridad y sesión

**Qué hace el frontend:** toda ruta, excepto `/login`, exige sesión (`ProtectedRoute`). Sin sesión,
cualquier URL (incluida `/`, `/facturas/...` o una inexistente) lleva a `/login`, y tras iniciar
sesión se vuelve a la página que se pidió. Con sesión, `/login` redirige a `/facturas`.
Si cualquier petición recibe `401`, se descarta la sesión y se manda al login. Falla cerrado:
si no se puede confirmar la sesión, se trata como "sin sesión".

**Qué NO es esto:** una protección real. El código del navegador lo puede leer y modificar
cualquiera, así que ocultar pantallas no protege datos. La barrera verdadera es que **el backend
exija sesión en cada endpoint y responda `401`** sin ella. Hoy los datos de facturas viajan dentro
del propio JavaScript (`mockInvoices.js`), por lo que cualquiera puede verlos aunque no inicie sesión.

**Cuenta demo (solo mientras `USE_MOCK = true`):** `demo@invoice.local` (o `demo`) / `Demo2026!`.
Esas credenciales están en el código, no protegen nada. La "sesión" demo vive en `sessionStorage`
y se pierde al cerrar la pestaña.

**Contrato propuesto para el backend** (detallado en `lib/api.js`):

| Endpoint | Respuesta |
|---|---|
| `POST /auth/login` `{ identifier, password, remember }` | `200 { user }` + cookie de sesión; `401` si son incorrectas |
| `GET /auth/me` | `200 { user }` o `401` |
| `POST /auth/logout` | `204`, invalida la sesión en el servidor |

- La sesión debe ir en una **cookie `HttpOnly; Secure; SameSite=Lax` (o `Strict`)**. El frontend no
  guarda tokens: así un XSS no puede robar la sesión. Si por algo se usa un token en `localStorage`,
  es robable por cualquier script inyectado.
- Mismo mensaje para usuario inexistente y clave incorrecta (ya lo hace el frontend).
- **Límite de intentos / bloqueo temporal** en `/auth/login` (fuerza bruta): solo lo puede hacer el backend.
- Si el backend corre en otro origen, CORS con origen exacto (no `*`) y
  `Access-Control-Allow-Credentials: true`; el frontend ya envía `credentials: 'include'`.
  Con el proxy de `vite.config.js` no hace falta.
- Si se usan cookies, definir protección CSRF (con `SameSite` y JSON suele bastar; confirmarlo).
- En producción: HTTPS, cabeceras `Content-Security-Policy`, `X-Content-Type-Options` y
  `frame-ancestors` desde el servidor/hosting.

**Antes de producción:** `USE_MOCK = false` en `lib/api.js`, borrar `lib/mockAuth.js` y `lib/mockInvoices.js`.

## Decisiones a tener en cuenta

- **Semáforo:** la regla estado → color vive solo en `lib/semaphore.js`. El color siempre
  va acompañado de texto.
- **Los ojos de las facturas del login** los mueve `hooks/useEyeTracking.js` (se desactiva con
  `prefers-reduced-motion`). En móvil la ilustración se muestra compacta sobre el formulario.
- **Responsive.** Puntos de corte de Tailwind: `lg` (1024px) cambia entre encabezado con menú
  desplegable y barra lateral, y entre tarjetas y tabla en el listado; `xl` (1280px) muestra las
  columnas Orden de compra y Emisión y pone la revisión en dos columnas; `sm` (640px) cambia las
  líneas de la factura de lista a tabla. Si cambias un punto de corte, ajusta los tres juntos para
  que no queden tamaños con tablas cortadas. Los textos del listado existen dos veces en el DOM
  (tarjeta y tabla, una oculta por CSS): en pruebas automáticas filtrar por elementos visibles.
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
- Conectar `login`/`getSession`/`logout` al backend real y definir roles/permisos por ruta.
- Registro y recuperar contraseña.
- Reemplazar `useAsync` por TanStack Query si se necesita caché o invalidación.
