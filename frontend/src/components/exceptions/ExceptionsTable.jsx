import { useMemo, useState } from 'react'
import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Download, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
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
import { downloadCsv, toCsv } from '@/lib/exportCsv'
import { formatDateTime } from '@/lib/format'
import { EXCEPTION_STAGE, EXCEPTION_STATUS, SEVERITY, SEVERITY_RANK } from '@/lib/semaphore'
import { cn } from '@/lib/utils'
import { ExceptionCard } from './ExceptionCard'
import { ExceptionStatusBadge, SeverityBadge } from './ExceptionBadges'
import { ExceptionRowActions } from './ExceptionRowActions'

/* -------------------------------------------------------------------------- */
/* Configuración de la tabla (a nivel de módulo: debe ser estable entre renders) */
/* -------------------------------------------------------------------------- */

const PAGE_SIZE = 8

const features = tableFeatures({
  rowSortingFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text, basic: sortFn_basic },
  filterFns: { includesString: filterFn_includesString },
})

const INITIAL_STATE = {
  sorting: [{ id: 'occurredAt', desc: true }],
  pagination: { pageIndex: 0, pageSize: PAGE_SIZE },
}

const SEARCHABLE_COLUMNS = new Set(['detail', 'invoice'])

/** Clases completas (no armadas con texto) para que Tailwind las detecte. */
const HIDE_BELOW = { xl: 'hidden xl:table-cell' }

const helper = createColumnHelper()

/** Las columnas dependen de `onOpen`, que debe ser estable (useCallback) en quien llama. */
function buildColumns(onOpen) {
  return helper.columns([
    // Se ordena por número (marca de tiempo), no por texto: las zonas horarias distintas
    // harían que un orden alfabético de fechas ISO saliera mal.
    helper.accessor((row) => Date.parse(row.occurredAt), {
      id: 'occurredAt',
      header: 'Fecha',
      cell: ({ row }) => (
        <span className="whitespace-nowrap tabular-nums">{formatDateTime(row.original.occurredAt)}</span>
      ),
    }),
    helper.accessor((row) => SEVERITY_RANK[row.severity], {
      id: 'severity',
      header: 'Severidad',
      // El rango es 0 = Error, 2 = Informativo. Con el primer clic en ascendente, lo más
      // grave sale arriba (TanStack ordena los números de mayor a menor por defecto).
      sortDescFirst: false,
      cell: ({ row }) => <SeverityBadge severity={row.original.severity} />,
    }),
    // El valor junta código, mensaje y etapa para que la búsqueda encuentre por cualquiera.
    helper.accessor((row) => `${row.code} ${row.message} ${EXCEPTION_STAGE[row.stage]}`, {
      id: 'detail',
      header: 'Detalle',
      enableSorting: false,
      cell: ({ row }) => {
        const e = row.original
        return (
          <button
            type="button"
            onClick={() => onOpen(e)}
            className="block max-w-md rounded-sm text-left whitespace-normal outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="block text-sm leading-snug">{e.message}</span>
            <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
              {e.code} · {EXCEPTION_STAGE[e.stage]}
              {e.invoiceNumber && <span className="xl:hidden"> · {e.invoiceNumber}</span>}
            </span>
          </button>
        )
      },
    }),
    helper.accessor((row) => `${row.invoiceNumber ?? ''} ${row.supplierName ?? ''}`.trim(), {
      id: 'invoice',
      header: 'Factura',
      meta: { hideBelow: 'xl' },
      cell: ({ row }) => {
        const e = row.original
        if (!e.invoiceId) return <span className="text-muted-foreground">—</span>
        return (
          <div className="min-w-0">
            <Link
              to={ROUTES.invoiceReview(e.invoiceId)}
              className="font-medium underline-offset-4 hover:underline"
            >
              {e.invoiceNumber}
            </Link>
            <div className="max-w-44 truncate text-xs text-muted-foreground">{e.supplierName}</div>
          </div>
        )
      },
    }),
    helper.accessor('status', {
      header: 'Estado',
      cell: ({ row }) => <ExceptionStatusBadge status={row.original.status} />,
    }),
    helper.display({
      id: 'actions',
      header: () => <span className="sr-only">Acciones</span>,
      meta: { align: 'right' },
      cell: ({ row }) => <ExceptionRowActions exception={row.original} onOpen={onOpen} />,
    }),
  ])
}

/* -------------------------------------------------------------------------- */
/* Exportación                                                                 */
/* -------------------------------------------------------------------------- */

const CSV_COLUMNS = [
  { header: 'Fecha', value: (e) => e.occurredAt },
  { header: 'Etapa', value: (e) => EXCEPTION_STAGE[e.stage] },
  { header: 'Severidad', value: (e) => SEVERITY[e.severity].label },
  { header: 'Código', value: (e) => e.code },
  { header: 'Mensaje', value: (e) => e.message },
  { header: 'Detalle', value: (e) => e.details },
  { header: 'Factura', value: (e) => e.invoiceNumber },
  { header: 'Proveedor', value: (e) => e.supplierName },
  { header: 'Estado', value: (e) => EXCEPTION_STATUS[e.status] },
  { header: 'Nota de resolución', value: (e) => e.resolution?.note },
  { header: 'Resuelta por', value: (e) => e.resolution?.by },
  { header: 'Fecha de resolución', value: (e) => e.resolution?.at },
]

function todayStamp() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/* -------------------------------------------------------------------------- */
/* Componente                                                                  */
/* -------------------------------------------------------------------------- */

const STAGE_FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'extraction', label: EXCEPTION_STAGE.extraction },
  { value: 'validation', label: EXCEPTION_STAGE.validation },
  { value: 'accounting', label: EXCEPTION_STAGE.accounting },
]

export function ExceptionsTable({ items, onOpen }) {
  const [stage, setStage] = useState('all')
  const [severity, setSeverity] = useState('all')
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')

  const columns = useMemo(() => buildColumns(onOpen), [onOpen])

  const stageCounts = useMemo(() => {
    const counts = { all: items.length, extraction: 0, validation: 0, accounting: 0 }
    for (const item of items) counts[item.stage] += 1
    return counts
  }, [items])

  const data = useMemo(
    () =>
      items.filter(
        (e) =>
          (stage === 'all' || e.stage === stage) &&
          (severity === 'all' || e.severity === severity) &&
          (status === 'all' || e.status === status),
      ),
    [items, stage, severity, status],
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
  const total = table.getRowCount()
  const pageIndex = table.state.pagination.pageIndex
  const pageCount = table.getPageCount()
  const from = total === 0 ? 0 : pageIndex * PAGE_SIZE + 1
  const to = Math.min(total, (pageIndex + 1) * PAGE_SIZE)

  function exportCsv() {
    // Todas las filas que cumplen los filtros y la búsqueda, no solo la página visible.
    const exportRows = table.getSortedRowModel().rows.map((row) => row.original)
    downloadCsv(`facto-excepciones-${todayStamp()}.csv`, toCsv(exportRows, CSV_COLUMNS))
    toast.success('Archivo exportado', {
      description: `${exportRows.length} ${exportRows.length === 1 ? 'excepción' : 'excepciones'}`,
    })
  }

  return (
    <Tabs value={stage} onValueChange={setStage}>
      {/* Etapa: pestañas desde 640px; en móvil, un selector (las 4 pestañas no caben). */}
      <TabsList variant="neumorphic" aria-label="Filtrar por etapa" className="hidden sm:inline-flex">
        {STAGE_FILTERS.map(({ value, label }) => (
          <TabsTrigger key={value} value={value} className="gap-1.5">
            {label}
            <span className="text-xs text-muted-foreground tabular-nums">{stageCounts[value]}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      <NativeSelect aria-label="Etapa" value={stage} onChange={(e) => setStage(e.target.value)} wrapperClassName="sm:hidden">
        {STAGE_FILTERS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label} ({stageCounts[value]})
          </option>
        ))}
      </NativeSelect>

      <div className="mt-2 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <NativeSelect aria-label="Severidad" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="all">Toda severidad</option>
            <option value="error">Errores</option>
            <option value="warning">Advertencias</option>
            <option value="info">Informativas</option>
          </NativeSelect>
          <NativeSelect aria-label="Estado" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Todo estado</option>
            <option value="open">Abiertas</option>
            <option value="resolved">Resueltas</option>
          </NativeSelect>
        </div>

        <div className="relative sm:ml-auto sm:w-72">
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
            placeholder="Buscar código, mensaje o factura"
            aria-label="Buscar excepciones"
            className="h-9 pl-8"
          />
        </div>

        <Button type="button" variant="outline" className="h-9" disabled={total === 0} onClick={exportCsv}>
          <Download />
          Exportar CSV
        </Button>
      </div>

      <TabsContent value={stage} className="mt-2">
        {/* Menos de 1024px: tarjetas. */}
        {rows.length === 0 ? (
          <p className="rounded-lg border bg-background py-10 text-center text-sm text-muted-foreground lg:hidden">
            No hay excepciones que coincidan con los filtros.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:hidden">
            {rows.map((row) => (
              <ExceptionCard key={row.id} exception={row.original} onOpen={onOpen} />
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
                    const SortIcon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown

                    return (
                      <TableHead
                        key={header.id}
                        aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                        className={cn(
                          alignRight && 'text-right',
                          HIDE_BELOW[header.column.columnDef.meta?.hideBelow],
                        )}
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="inline-flex items-center gap-1 rounded-sm hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          >
                            <table.FlexRender header={header} />
                            <SortIcon aria-hidden className={cn('size-3.5', !sorted && 'opacity-40')} />
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
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                    No hay excepciones que coincidan con los filtros.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getAllCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          'align-top',
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

        {total > 0 && (
          <div className="mt-4 flex flex-col items-center justify-between gap-3 text-sm sm:flex-row">
            <p className="text-muted-foreground" aria-live="polite">
              Mostrando {from}–{to} de {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
              >
                <ChevronLeft />
                Anterior
              </Button>
              <span className="min-w-24 text-center text-muted-foreground tabular-nums">
                Página {pageIndex + 1} de {pageCount}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
              >
                Siguiente
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
