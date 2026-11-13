# Facto — Frontend

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
│   │                     + checkbox, password-input, progress, native-select, popover y
│   │                     form-field escritos a mano
│   ├── layouts/          DashboardLayout, AuthLayout, ProtectedRoute, PublicOnlyRoute,
│   │                     SessionCheck, PageHeader
│   ├── auth/             InvoiceCharacters (facturas con ojos del login)
│   ├── brand/            BrandMark (el nombre "Facto" en la tipografía de marca)
│   ├── invoices/         InvoicesTable, InvoiceCard, InvoiceStatusBadge, InvoiceRowActions
│   ├── review/           ExtractedDataForm, ValidationFindings, InvoiceLinesTable,
│   │                     RejectDialog, ConfirmApproveDialog
│   ├── upload/           Dropzone, UploadQueue, AiAssistantPanel
│   ├── assistant/        FloatingAssistant (burbuja flotante de IA, en todas las pantallas)
│   ├── contracts/        ContractsSummary, ContractsTable, ContractCard, ContractStatusBadge,
│   │                     ContractRowActions, ContractForm, ContractFinancialSummary, ObserveDialog
│   └── exceptions/       ExceptionsSummary, ExceptionsTable, ExceptionCard,
│                         ExceptionDetailDialog, ExceptionRowActions, ExceptionBadges
├── pages/                Una por ruta, export default: LoginPage, InvoicesPage,
│                         InvoiceReviewPage, ContractsPage, ContractReviewPage,
│                         UploadPage, ExceptionsPage
├── config/routes.js      ROUTES (rutas) y NAV_ITEMS (menú lateral)
├── context/              AuthContext (estado de sesión), auth.js (el contexto)
├── hooks/                useAsync, useAuth, useEyeTracking, useKeyboardModality,
│                         useSlidingIndicator, useUploadQueue, useZeroGravityDrift
├── lib/
│   ├── api.js            apiFetch + sesión, facturas, contratos, carga y excepciones (datos de ejemplo)
│   ├── mockInvoices.js   facturas de ejemplo
│   ├── mockContracts.js  contratos de ejemplo (ct_001 a ct_010)
│   ├── contracts.js      lógica pura: IVA, total, saldo, % ejecutado, alertas del contrato
│   ├── contractSchemas.js esquema Zod del formulario de revisión (incluye las 3 confirmaciones)
│   ├── mockExceptions.js excepciones de ejemplo (log)
│   ├── mockUploads.js    escenarios que simulan a la IA al subir un documento
│   ├── uploadRules.js    reglas de archivos: tipos, tamaño, firma del contenido
│   ├── exportCsv.js      exportación a CSV (protegida contra inyección de fórmulas)
│   ├── exceptionSchemas.js esquema Zod de la nota al resolver una excepción
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

**Antes de producción:** `USE_MOCK = false` en `lib/api.js`, borrar `lib/mockAuth.js`,
`lib/mockInvoices.js`, `lib/mockContracts.js`, `lib/mockExceptions.js` y `lib/mockUploads.js`.

## Carga de documentos y asistente de IA

`/carga`: zona de arrastre (PDF o XML), lista de documentos con su estado y, a la derecha, el
**recuadro del asistente de IA** (`AiAssistantPanel`), que ocupa la mitad del ancho desde 1280px
(`xl:grid-cols-2`) y explica el resultado del documento seleccionado. Tiene tres fases:

1. **Sin documento:** rectángulo compacto con una luz animada y una frase que rota
   ("Quiero analizar tu factura…").
2. **Procesando:** dice "Analizando…" y la etapa actual (recibiendo, leyendo, razonando,
   buscando duplicados). No muestra una lista de pasos.
3. **Con respuesta:** el recuadro se expande hacia abajo con el resumen en lenguaje claro, los
   hallazgos, qué hacer ahora (pasos numerados) y acceso a la revisión.

En pantallas angostas el orden es: zona de carga, respuesta de la IA, lista. La parte cerrada del
recuadro es `inert` para que no reciba foco, y un texto `sr-only` con `role="status"` anuncia cada
fase a los lectores de pantalla.

**La IA hoy es simulada.** Las cargas siguen un ciclo fijo para poder ver todos los casos en una
demo: 1.ª validada, 2.ª con advertencias, 3.ª con errores críticos, 4.ª ilegible, y vuelve a
empezar (`lib/mockUploads.js`). Crean la factura en el listado y dejan excepciones en el log.

**Contrato propuesto** (detallado en `lib/api.js` y `lib/invoiceTypes.js`): `POST /invoices/upload`
(multipart) devuelve un trabajo cuyo avance se consulta o se recibe por SSE; al terminar entrega
`{ analysis: { outcome, summary, recommendations[] }, invoice? }`. El texto de `analysis` lo redacta
la IA en el backend; el frontend solo lo muestra.

Seguridad de la carga:
- Las validaciones del navegador (extensión, 10 MB, máximo 10 por carga, firma del contenido:
  `%PDF-` / `<`) son comodidad, no protección. **El backend debe repetirlas** (tipo real, tamaño,
  antivirus) y no confiar en el nombre ni en el tipo MIME que envía el cliente.
- Los nombres de archivo se muestran como texto, nunca como HTML.
- La respuesta de la IA es contenido no confiable: mostrarla siempre como texto (React ya lo hace);
  nunca con `dangerouslySetInnerHTML`.
- El recuadro avisa que la IA puede equivocarse; la decisión final es de la persona que aprueba.

## Asistente flotante

`components/assistant/FloatingAssistant.jsx`, montado en `DashboardLayout` (no aparece en el login).
Empieza como una burbuja líquida (contorno irregular que cambia, varias capas) que flota en un
espacio reducido, "gravedad cero", movida por `hooks/useZeroGravityDrift`. A los 3,5 s vuelve a su
sitio y se estira en un rectángulo con "¿Necesitas ayuda? Soy tu asistente de IA". La `×` lo
descarta para el resto de la sesión, y abrir el panel también. Al tocarlo abre un panel con cuatro
atajos (subir factura, revisar facturas, validar un contrato, ver excepciones).

**Todavía no hay conversación**: depende del servicio de IA, y el panel lo dice. No se simulan
respuestas. Con "reducir movimiento" del sistema no se mueve. `main` lleva `pb-28` para poder
desplazar el contenido por encima de la burbuja.

## Contratos

`/contratos`: resumen (total, pendientes, con observaciones, validados), pestañas por estado
(selector en móvil), filtro por tipo, búsqueda por número, contraparte, NIT o tipo, y orden por
columna. Tabla desde 1024px y tarjetas por debajo. `/contratos/:id/revision` es la validación manual.

- **Tres bloques:** Detalles (número, contraparte, NIT, fechas, plazo, objeto), Montos (valor, IVA,
  moneda, periodicidad de cobro) y Tipo de contrato. El **resumen calculado** (IVA, total con IVA,
  facturado, saldo, % ejecutado) se recalcula al editar. `billedToDate` no se edita aquí.
- **Validar** exige marcar las tres confirmaciones ("revisé los detalles / los montos / el tipo").
  Lo impone el esquema Zod (`reviewed.*` debe ser `true`), no solo la interfaz. Los campos que la
  persona corrigió quedan anotados en `validation.corrections`.
- **Dejar observaciones** exige un motivo de al menos 10 caracteres. Un contrato observado se puede
  volver a revisar. Uno **validado queda cerrado** y de solo lectura.
- **Puntos de atención:** avisa si lo facturado supera el valor del contrato, si ya venció o vence
  pronto, y si el IVA es 0%.

**Contrato propuesto para el backend** (detallado en `lib/api.js` y `lib/invoiceTypes.js`):

| Endpoint | Respuesta |
|---|---|
| `GET /contracts` | lista de contratos |
| `GET /contracts/:id` | el contrato, o `404` |
| `POST /contracts/:id/validate` `{ values, reviewed }` | contrato actualizado, estado `validated` |
| `POST /contracts/:id/observe` `{ note }` | contrato actualizado, estado `observed` |

- **Quién validó u observó y cuándo lo decide el servidor** por la sesión; el cliente no envía
  `by` ni `at`.
- El backend debe **repetir las validaciones** (confirmaciones, valor mayor a 0, fin posterior al
  inicio, NIT) y rechazar la edición de contratos ya validados.

## Log de excepciones

`/excepciones`: resumen (abiertas, errores, advertencias, resueltas), filtros por etapa
(extracción / validación / causación), severidad y estado, búsqueda, orden, paginación de 8 en 8
y exportación a CSV de **todo lo filtrado** (no solo la página visible). Cada excepción tiene un
detalle; las abiertas se resuelven con una **nota obligatoria** (mínimo 10 caracteres) que queda
junto a quién y cuándo. Quién la resolvió lo decide el servidor por la sesión; el cliente no lo envía.

- CSV: cualquier celda que empiece con `=`, `+`, `-` o `@` se prefija con una comilla simple para
  que Excel no la ejecute como fórmula ("CSV injection"). Lleva BOM UTF-8 para las tildes.
- Contrato propuesto: `GET /exceptions` (más recientes primero) y `POST /exceptions/:id/resolve`
  `{ note }`. Con volúmenes grandes, pasar filtros, orden y paginación al servidor.

## Decisiones a tener en cuenta

- **Semáforo:** la regla estado → color vive solo en `lib/semaphore.js`. El color siempre
  va acompañado de texto.
- **Marca "Facto".** El nombre se dibuja siempre con `components/brand/BrandMark.jsx`, que usa
  la tipografía Sora (paquete `@fontsource-variable/sora`, se sirve desde el propio sitio, sin
  pedir nada a Google). La clase `font-brand` existe solo para el nombre; el texto de la app
  usa la fuente del sistema. Para cambiar el nombre o la fuente, editar ese componente y
  `--font-brand` en `src/index.css`.
- **Los ojos de las facturas del login** los mueve `hooks/useEyeTracking.js` (se desactiva con
  `prefers-reduced-motion`). En móvil la ilustración se muestra compacta sobre el formulario.
- **Responsive.** Puntos de corte de Tailwind: `lg` (1024px) cambia entre encabezado con menú
  desplegable y barra lateral, y entre tarjetas y tabla en el listado; `xl` (1280px) muestra las
  columnas Orden de compra y Emisión y pone la revisión en dos columnas; `sm` (640px) cambia las
  líneas de la factura de lista a tabla. Si cambias un punto de corte, ajusta los tres juntos para
  que no queden tamaños con tablas cortadas. Los textos del listado existen dos veces en el DOM
  (tarjeta y tabla, una oculta por CSS): en pruebas automáticas filtrar por elementos visibles.
- **Avisos (toasts) arriba al centro.** Las acciones de cada página (Validar, Aprobar…) están
  arriba a la derecha y el asistente flotante abajo a la derecha, así que ninguna de las dos
  esquinas debe taparse. En móvil bajan 64px para no cubrir el botón del menú (`mobileOffset`).
  Un aviso que se puede repetir (p. ej. "Falta completar la revisión") lleva `id` fijo para no apilarse.
- **`PageHeader`:** las acciones hacen `flex-wrap`. Con estado y varios botones no caben en una línea
  en móvil y desbordarían la página.
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
  Además, `tabs.jsx` tiene una variante propia (`neumorphic`, el selector en relieve con pieza
  deslizante) que se perdería: no sobrescribirlo, o volver a agregarla. Depende de las
  utilidades `neu-inset` y `neu-raised` (en `index.css`) y del hook `useSlidingIndicator`.
- **Selector neumórfico (`<TabsList variant="neumorphic">`).** La pista va hundida y la pieza en
  relieve es un elemento aparte que se desliza (350 ms) hasta la pestaña activa; `useSlidingIndicator`
  la coloca y la mantiene alineada si cambia el tamaño de la pantalla, los conteos o las fuentes. El
  primer acomodo al cargar no se anima. Con "reducir movimiento" del sistema salta directo. Las
  pestañas no cambian de grosor al seleccionarse, para que el ancho no varíe a mitad del movimiento.
  **Foco de teclado:** el botón no dibuja recuadro (quedaría fijo mientras la pieza se mueve); el
  contorno gris lo lleva la pieza y solo aparece si lo último que se hizo fue pulsar una tecla
  (`useKeyboardModality`). No se usa `:focus-visible` porque Chromium lo deja encendido tras usar
  el teclado una vez (p. ej. Enter al iniciar sesión) aunque después se haga clic con el mouse.
  No quitar ese indicador: es lo único que le dice a quien navega con teclado dónde está (WCAG 2.4.7).
- **Menús desplegables:** el ancho por defecto de `DropdownMenuContent` es el del botón que lo
  abre (el "⋯" mide ~32px) y parte las frases. Los menús de acciones usan `w-auto min-w-52`.
- `components.json` y `.oxlintrc.json` no se pudieron reescribir con `$schema` (el editor lo
  bloquea en modo Supervised). Es solo ayuda de autocompletado.

## Pendiente

- Conectar la carga y el log al backend real (la IA hoy es simulada, ver arriba).
- Cancelar una carga en curso (hoy solo se puede quitar de la lista al terminar).
- Visor del PDF original en la pestaña "Documento" (requiere URL del backend).
- Conectar `login`/`getSession`/`logout` al backend real y definir roles/permisos por ruta.
- Registro y recuperar contraseña.
- Reemplazar `useAsync` por TanStack Query si se necesita caché o invalidación.
