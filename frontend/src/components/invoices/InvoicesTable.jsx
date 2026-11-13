import { useMemo, useState } from 'react'
import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ROUTES } from '@/config/routes'
import { formatCurrency, formatDate } from '@/lib/format'
import { INVOICE_STATUS, LIGHT_RANK, LIGHT_STYLES, lightOf } from '@/lib/semaphore'
import { cn } from '@/lib/utils'
import { InvoiceCard } from './InvoiceCard'
import { InvoiceRowActions } from './InvoiceRowActions'
import { InvoiceStatusBadge } from './InvoiceStatusBadge'

/* -------------------------------------------------------------------------- */
/* Configuración de la tabla (a nivel de módulo: debe ser estable entre renders) */
/* -------------------------------------------------------------------------- */

const features = tableFeatures({
  rowSortingFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    text: sortFn_text,
    basic: sortFn_basic,
  },
  filterFns: { includesString: filterFn_includesString },
})

const SEARCHABLE_COLUMNS = new Set(['invoiceNumber', 'supplier', 'purchaseOrderNumber'])

/**
 * Columnas que se ocultan en pantallas medianas para que Estado y Total siempre
 * quepan. Las clases van completas (no armadas con texto) para que Tailwind las detecte.
 * Aun ocultas, siguen siendo buscables.
 */
const HIDE_BELOW = {
  xl: 'hidden xl:table-cell',
}

const helper = createColumnHelper()

// `meta.align` solo lo lee este componente para alinear a la derecha.
const columns = helper.columns([
  helper.accessor('invoiceNumber', {
    header: 'Factura',
    cell: ({ row }) => (
      <Link
        to={ROUTES.invoiceReview(row.original.id)}
        className="font-medium underline-offset-4 hover:underline"
      >
        {row.original.invoiceNumber}
      </Link>
    ),
  }),
  // El valor "nombre NIT" permite que la búsqueda global encuentre por ambos.
  helper.accessor((row) => `${row.supplierName} ${row.supplierNit}`, {
    id: 'supplier',
    header: 'Proveedor',
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="truncate">{row.original.supplierName}</div>
        <div className="text-xs text-muted-foreground">NIT {row.original.supplierNit}</div>
      </div>
    ),
  }),
  helper.accessor('purchaseOrderNumber', {
    header: 'Orden de compra',
    meta: { hideBelow: 'xl' },
    cell: ({ row }) =>
      row.original.purchaseOrderNumber || <span className="text-muted-foreground">Sin OC</span>,
  }),
  helper.accessor('issueDate', {
    header: 'Emisión',
    meta: { hideBelow: 'xl' },
    cell: ({ row }) => formatDate(row.original.issueDate),
  }),
  helper.accessor('total', {
    header: 'Total',
    meta: { align: 'right' },
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatCurrency(row.original.total, row.original.currency)}
      </span>
    ),
  }),
  helper.accessor((row) => row.findings.filter((f) => f.severity !== 'info').length, {
    id: 'findings',
    header: 'Hallazgos',
    meta: { align: 'right' },
    cell: ({ getValue }) => {
      const count = getValue()
      return count > 0 ? (
        <span className="tabular-nums">{count}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      )
    },
  }),
  helper.accessor((row) => LIGHT_RANK[INVOICE_STATUS[row.status].light], {
    id: 'status',
    header: 'Estado',
    cell: ({ row }) => <InvoiceStatusBadge status={row.original.status} />,
  }),
  helper.display({
    id: 'actions',
    header: () => <span className="sr-only">Acciones</span>,
    meta: { align: 'right' },
    cell: ({ row }) => <InvoiceRowActions invoice={row.original} />,
  }),
])

const INITIAL_STATE = {
  sorting: [{ id: 'status', desc: false }],
}

/* -------------------------------------------------------------------------- */
/* Componente                                                                  */
/* -------------------------------------------------------------------------- */

const FILTER_LABELS = {
  all: 'Todas',
  green: 'Verificada',
  yellow: 'Revisión',
  red: 'Rechazada',
}

const FILTER_ORDER = ['all', 'green', 'yellow', 'red']

export function InvoicesTable({ invoices }) {
  const [lightFilter, setLightFilter] = useState('all')
  const [search, setSearch] = useState('')

  const counts = useMemo(() => {
    const result = { all: invoices.length, red: 0, yellow: 0, green: 0 }
    for (const invoice of invoices) result[lightOf(invoice)] += 1
    return result
  }, [invoices])

  const data = useMemo(
    () =>
      lightFilter === 'all'
        ? invoices
        : invoices.filter((invoice) => lightOf(invoice) === lightFilter),
    [invoices, lightFilter],
  )

  const table = useTable({
    features,
    columns,
    data,
    initialState: INITIAL_STATE,
    globalFilterFn: 'includesString',
    getColumnCanGlobalFilter: (column) => SEARCHABLE_COLUMNS.has(column.id),
  })

  const rows = table.getRowModel().rows

  return (
    <Tabs value={lightFilter} onValueChange={setLightFilter}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <TabsList variant="neumorphic" aria-label="Filtrar por estado">
          {FILTER_ORDER.map((filter) => (
            <TabsTrigger key={filter} value={filter} className="gap-1.5">
              {filter !== 'all' && (
                <span
                  aria-hidden
                  className={cn('size-2 rounded-full', LIGHT_STYLES[filter].dot)}
                />
              )}
              {FILTER_LABELS[filter]}
              <span className="text-xs text-muted-foreground tabular-nums">
                {counts[filter]}
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
            onChange={(event) => {
              setSearch(event.target.value)
              table.setGlobalFilter(event.target.value)
            }}
            placeholder="Buscar factura, proveedor, NIT u OC"
            aria-label="Buscar facturas"
            className="pl-8"
          />
        </div>
      </div>

      <TabsContent value={lightFilter}>
        {/* Menos de 1024px: tarjetas (la tabla no cabe sin cortar el Estado y el Total). */}
        {rows.length === 0 ? (
          <p className="rounded-lg border bg-background py-10 text-center text-sm text-muted-foreground lg:hidden">
            No hay facturas que coincidan con el filtro.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:hidden">
            {rows.map((row) => (
              <InvoiceCard key={row.id} invoice={row.original} />
            ))}
          </ul>
        )}

        {/* Desde 1024px: tabla. */}
        <div className="hidden rounded-lg border bg-background lg:block">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id}>
                  {group.headers.map((header) => {
                    const sorted = header.column.getIsSorted()
                    const canSort = header.column.getCanSort()
                    const alignRight = header.column.columnDef.meta?.align === 'right'
                    const SortIcon =
                      sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown

                    return (
                      <TableHead
                        key={header.id}
                        aria-sort={
                          sorted === 'asc'
                            ? 'ascending'
                            : sorted === 'desc'
                              ? 'descending'
                              : undefined
                        }
                        className={cn(
                          alignRight && 'text-right',
                          HIDE_BELOW[header.column.columnDef.meta?.hideBelow],
                        )}
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className={cn(
                              'inline-flex items-center gap-1 rounded-sm hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                              alignRight && 'flex-row-reverse',
                            )}
                          >
                            <table.FlexRender header={header} />
                            <SortIcon
                              aria-hidden
                              className={cn('size-3.5', !sorted && 'opacity-40')}
                            />
                          </button>
                        ) : (
                          <table.FlexRender header={header} />
                        )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No hay facturas que coincidan con el filtro.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getAllCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          cell.column.columnDef.meta?.align === 'right' && 'text-right',
                          HIDE_BELOW[cell.column.columnDef.meta?.hideBelow],
                        )}
                      >
                        <table.FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  )
}
