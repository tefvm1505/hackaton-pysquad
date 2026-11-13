import { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CircleX,
  ClipboardList,
  Clock,
  ExternalLink,
  FileSignature,
  Layers,
  Package,
  RefreshCw,
  Search,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layouts/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ROUTES } from '@/config/routes'
import { useAsync } from '@/hooks/useAsync'
import { getPurchaseOrderItems, listPurchaseOrders } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/format'
import { LIGHT_STYLES } from '@/lib/semaphore'
import { cn } from '@/lib/utils'

/* -------------------------------------------------------------------------- */
/* Configuración de estados de Órdenes de Compra                               */
/* -------------------------------------------------------------------------- */

const ESTADO_CONFIG = {
  aprobada: { label: 'Aprobada', icon: CheckCircle2, light: 'green' },
  recibida: { label: 'Recibida', icon: Package, light: 'green' },
  pendiente: { label: 'Pendiente', icon: Clock, light: 'yellow' },
  cancelada: { label: 'Cancelada', icon: CircleX, light: 'red' },
}

const DEFAULT_CONFIG = { label: 'Pendiente', icon: Clock, light: 'yellow' }

function getStatusConfig(estado) {
  if (!estado) return DEFAULT_CONFIG
  return ESTADO_CONFIG[String(estado).toLowerCase().trim()] ?? DEFAULT_CONFIG
}

function OrderStatusBadge({ estado }) {
  const config = getStatusConfig(estado)
  const Icon = config.icon
  const styles = LIGHT_STYLES[config.light]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        styles.badge,
      )}
    >
      <span aria-hidden className={cn('size-1.5 rounded-full', styles.dot)} />
      <Icon className="size-3.5" aria-hidden />
      {config.label}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/* Métricas de resumen                                                         */
/* -------------------------------------------------------------------------- */

function MetricCard({ label, value, icon: Icon, tone, helperText }) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3 p-4">
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl',
            tone ? cn('border', LIGHT_STYLES[tone].panel) : 'bg-muted',
          )}
        >
          <Icon aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold leading-none tabular-nums">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
          {helperText && (
            <p className="mt-0.5 text-[11px] font-medium text-muted-foreground/80">{helperText}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function PurchaseOrdersSummary({ orders }) {
  const counts = useMemo(() => {
    const summary = {
      total: orders.length,
      aprobadas: 0,
      pendientes: 0,
      canceladas: 0,
      montoTotal: 0,
    }
    for (const ord of orders) {
      const estado = String(ord.estado || '').toLowerCase().trim()
      if (estado === 'aprobada' || estado === 'recibida') summary.aprobadas++
      else if (estado === 'cancelada') summary.canceladas++
      else summary.pendientes++

      summary.montoTotal += Number(ord.total || 0)
    }
    return summary
  }, [orders])

  return (
    <section aria-label="Resumen de órdenes de compra" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MetricCard
        label="Total órdenes"
        value={counts.total}
        icon={ClipboardList}
        helperText={formatCurrency(counts.montoTotal)}
      />
      <MetricCard
        label="Aprobadas / Recibidas"
        value={counts.aprobadas}
        icon={CheckCircle2}
        tone="green"
      />
      <MetricCard
        label="Pendientes"
        value={counts.pendientes}
        icon={Clock}
        tone="yellow"
      />
      <MetricCard
        label="Canceladas"
        value={counts.canceladas}
        icon={CircleX}
        tone="red"
      />
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* Diálogo de Detalle de Orden e Ítems Asociados                               */
/* -------------------------------------------------------------------------- */

function PurchaseOrderDetailContent({ order, onClose }) {
  const [itemsData, setItemsData] = useState(null)
  const [loadingItems, setLoadingItems] = useState(true)
  const [itemsError, setItemsError] = useState(null)

  useEffect(() => {
    let isMounted = true
    getPurchaseOrderItems(order.id)
      .then((res) => {
        if (isMounted) {
          setItemsData(res.items || [])
          setLoadingItems(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setItemsError(err.message || 'Error al obtener los ítems de la orden')
          setLoadingItems(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [order.id])

  const itemsTotal = (itemsData || []).reduce((acc, item) => acc + (Number(item.total) || 0), 0)

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92dvh] w-full overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
            <DialogTitle className="flex items-center gap-2.5 text-xl font-bold">
              <ClipboardList className="size-6 text-primary" aria-hidden />
              Orden de Compra #{order.numeroOrden}
            </DialogTitle>
            <OrderStatusBadge estado={order.estado} />
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Consulta los atributos completos de la orden de compra y los ítems detallados asociados.
          </DialogDescription>
        </DialogHeader>

        {/* Atributos de la Orden */}
        <div className="grid gap-4 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileSignature className="size-3.5" aria-hidden /> Contrato asociado
            </span>
            <div className="flex items-center gap-1 font-semibold text-foreground">
              <Link
                to={ROUTES.contractReview(order.idContrato)}
                className="group flex items-center gap-1 text-primary hover:underline"
              >
                <span className="truncate max-w-[140px]">{order.idContrato}</span>
                <ExternalLink className="size-3 opacity-70 group-hover:opacity-100" />
              </Link>
            </div>
          </div>

          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="size-3.5" aria-hidden /> NIT Emisor
            </span>
            <p className="font-semibold text-foreground tabular-nums">{order.nitEmisor}</p>
          </div>

          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="size-3.5" aria-hidden /> Emisión
            </span>
            <p className="font-semibold text-foreground">
              {order.fechaEmision ? formatDate(order.fechaEmision) : '—'}
            </p>
          </div>

          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5" aria-hidden /> Entrega esperada
            </span>
            <p className="font-semibold text-foreground">
              {order.fechaEsperada ? formatDate(order.fechaEsperada) : 'Sin fecha'}
            </p>
          </div>
        </div>

        {/* Resumen financiero */}
        <div className="grid grid-cols-3 gap-3 rounded-lg border bg-background p-3 text-center sm:text-left">
          <div className="sm:px-2">
            <span className="text-xs text-muted-foreground">Subtotal</span>
            <p className="text-sm font-semibold tabular-nums sm:text-base">
              {formatCurrency(order.subtotal)}
            </p>
          </div>
          <div className="border-x px-2">
            <span className="text-xs text-muted-foreground">IVA</span>
            <p className="text-sm font-semibold tabular-nums sm:text-base">
              {formatCurrency(order.iva)}
            </p>
          </div>
          <div className="sm:px-2">
            <span className="text-xs font-medium text-primary">Total Orden</span>
            <p className="text-sm font-bold text-primary tabular-nums sm:text-base">
              {formatCurrency(order.total)}
            </p>
          </div>
        </div>

        {/* Sección de Ítems */}
        <div className="mt-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Layers className="size-4 text-muted-foreground" aria-hidden />
              Ítems asociados a la orden
              {itemsData && (
                <Badge variant="secondary" className="ml-1 text-[11px]">
                  {itemsData.length} {itemsData.length === 1 ? 'producto' : 'productos'}
                </Badge>
              )}
            </h3>
          </div>

          {loadingItems ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <RefreshCw className="size-6 animate-spin text-primary" aria-hidden />
              <p className="mt-2 text-xs">Cargando ítems desde el servidor…</p>
            </div>
          ) : itemsError ? (
            <Alert variant="destructive">
              <CircleAlert className="size-4" />
              <AlertTitle>Error al cargar ítems</AlertTitle>
              <AlertDescription className="text-xs">{itemsError}</AlertDescription>
            </Alert>
          ) : !itemsData || itemsData.length === 0 ? (
            <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
              No hay ítems registrados para esta orden de compra.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Precio Unitario</TableHead>
                    <TableHead className="text-right font-medium">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsData.map((item, index) => (
                    <TableRow key={item.id ?? index} className="text-xs">
                      <TableCell className="text-center font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {item.descripcion}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.cantidad}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(item.precioUnitario)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatCurrency(item.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-muted/30 font-semibold text-xs">
                    <TableCell colSpan={4} className="text-right">
                      Suma de ítems:
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">
                      {formatCurrency(itemsTotal)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PurchaseOrderDetailDialog({ order, onClose }) {
  if (!order) return null
  return <PurchaseOrderDetailContent key={order.id} order={order} onClose={onClose} />
}

/* -------------------------------------------------------------------------- */
/* Vista Principal: PurchaseOrdersPage                                         */
/* -------------------------------------------------------------------------- */

const STATUS_FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'aprobada', label: 'Aprobadas', light: 'green' },
  { value: 'pendiente', label: 'Pendientes', light: 'yellow' },
  { value: 'recibida', label: 'Recibidas', light: 'green' },
  { value: 'cancelada', label: 'Canceladas', light: 'red' },
]

function matchesStatus(order, filter) {
  if (filter === 'all') return true
  const st = String(order.estado || '').toLowerCase().trim()
  return st === filter
}

export default function PurchaseOrdersPage() {
  const { data, error, isLoading, reload } = useAsync(listPurchaseOrders, [])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const statusCounts = useMemo(() => {
    const res = {}
    for (const { value } of STATUS_FILTERS) {
      res[value] = data ? data.filter((o) => matchesStatus(o, value)).length : 0
    }
    return res
  }, [data])

  const filteredOrders = useMemo(() => {
    if (!data) return []
    return data.filter((order) => {
      if (!matchesStatus(order, statusFilter)) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const text = `${order.numeroOrden} ${order.idContrato} ${order.nitEmisor} ${order.estado}`.toLowerCase()
        if (!text.includes(q)) return false
      }
      return true
    })
  }, [data, statusFilter, search])

  return (
    <>
      <PageHeader
        title="Órdenes de Compra"
        description="Mapeo general de órdenes de compra, validación de ítems asociados y montos pactados."
        actions={
          <Button variant="outline" onClick={reload} disabled={isLoading}>
            <RefreshCw className={isLoading ? 'animate-spin' : undefined} />
            Actualizar
          </Button>
        }
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudieron cargar las órdenes de compra</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : !data ? (
        <p role="status" className="py-12 text-center text-sm text-muted-foreground">
          Cargando órdenes de compra…
        </p>
      ) : (
        <>
          <PurchaseOrdersSummary orders={data} />

          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <TabsList variant="neumorphic" aria-label="Filtrar por estado">
                {STATUS_FILTERS.map(({ value, label, light }) => (
                  <TabsTrigger key={value} value={value} className="gap-1.5">
                    {light && (
                      <span
                        aria-hidden
                        className={cn('size-2 rounded-full', LIGHT_STYLES[light].dot)}
                      />
                    )}
                    {label}
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {statusCounts[value]}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="relative w-full sm:w-72">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por orden, contrato o NIT…"
                  aria-label="Buscar órdenes de compra"
                  className="h-9 pl-8"
                />
              </div>
            </div>

            <TabsContent value={statusFilter}>
              {filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-lg border bg-background py-16 text-center">
                  <ClipboardList aria-hidden className="size-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    No se encontraron órdenes de compra que coincidan con los filtros.
                  </p>
                </div>
              ) : (
                <>
                  {/* Vista Desktop: Tabla */}
                  <div className="hidden rounded-lg border bg-card md:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="font-semibold">Nº Orden</TableHead>
                          <TableHead className="font-semibold">Contrato</TableHead>
                          <TableHead className="font-semibold">NIT Emisor</TableHead>
                          <TableHead className="font-semibold">Fecha Emisión</TableHead>
                          <TableHead className="text-right font-semibold">Subtotal</TableHead>
                          <TableHead className="text-right font-semibold">IVA</TableHead>
                          <TableHead className="text-right font-semibold">Total</TableHead>
                          <TableHead className="text-center font-semibold">Estado</TableHead>
                          <TableHead className="text-right font-semibold">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.map((ord) => (
                          <TableRow
                            key={ord.id}
                            className="cursor-pointer transition-colors hover:bg-muted/50"
                            onClick={() => setSelectedOrder(ord)}
                          >
                            <TableCell className="font-medium text-foreground">
                              <span className="flex items-center gap-1.5 font-semibold text-primary">
                                <ClipboardList className="size-4" aria-hidden />
                                {ord.numeroOrden}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-xs text-muted-foreground">
                                {ord.idContrato}
                              </span>
                            </TableCell>
                            <TableCell className="tabular-nums">
                              {ord.nitEmisor}
                            </TableCell>
                            <TableCell className="text-muted-foreground tabular-nums text-xs">
                              {ord.fechaEmision ? formatDate(ord.fechaEmision) : '—'}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(ord.subtotal)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(ord.iva)}
                            </TableCell>
                            <TableCell className="text-right font-bold tabular-nums">
                              {formatCurrency(ord.total)}
                            </TableCell>
                            <TableCell className="text-center">
                              <OrderStatusBadge estado={ord.estado} />
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1 text-xs"
                                onClick={() => setSelectedOrder(ord)}
                              >
                                Ver ítems
                                <ChevronRight className="size-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Vista Mobile: Cards */}
                  <div className="grid gap-3 md:hidden">
                    {filteredOrders.map((ord) => (
                      <Card
                        key={ord.id}
                        className="cursor-pointer transition-all hover:shadow-md"
                        onClick={() => setSelectedOrder(ord)}
                      >
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <ClipboardList className="size-4 text-primary" />
                            {ord.numeroOrden}
                          </CardTitle>
                          <OrderStatusBadge estado={ord.estado} />
                        </CardHeader>
                        <CardContent className="space-y-2 text-xs">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Contrato:</span>
                            <span className="font-mono text-foreground">{ord.idContrato}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>NIT Emisor:</span>
                            <span className="text-foreground">{ord.nitEmisor}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Fecha emisión:</span>
                            <span>{ord.fechaEmision ? formatDate(ord.fechaEmision) : '—'}</span>
                          </div>
                          <div className="flex justify-between border-t pt-2 font-semibold text-sm">
                            <span>Total:</span>
                            <span className="text-primary font-bold">{formatCurrency(ord.total)}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="mt-2 w-full justify-between text-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedOrder(ord)
                            }}
                          >
                            <span>Ver atributos e ítems asociados</span>
                            <ChevronRight className="size-3.5" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>

          {/* Diálogo con los ítems y atributos */}
          <PurchaseOrderDetailDialog
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
          />
        </>
      )}
    </>
  )
}
