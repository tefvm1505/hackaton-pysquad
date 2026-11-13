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
import { formatCurrency, formatDate } from '@/lib/format'
import { CONTRACT_TYPE } from '@/lib/semaphore'
import { cn } from '@/lib/utils'
import { ContractCard } from './ContractCard'
import { ContractRowActions } from './ContractRowActions'
import { ContractStatusBadge } from './ContractStatusBadge'

/* -------------------------------------------------------------------------- */
/* Configuración de la tabla (a nivel de módulo: debe ser estable entre renders) */
/* -------------------------------------------------------------------------- */

const features = tableFeatures({
  rowSortingFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text, basic: sortFn_basic },
  filterFns: { includesString: filterFn_includesString },
})

const INITIAL_STATE = { sorting: [{ id: 'status', desc: false }] }
const SEARCHABLE_COLUMNS = new Set(['contractNumber', 'counterparty', 'type'])

/** Clases completas (no armadas con texto) para que Tailwind las detecte. */
const HIDE_BELOW = { xl: 'hidden xl:table-cell' }

/** Pendiente primero, luego observado, luego validado: lo que requiere acción arriba. */
const STATUS_RANK = { pending_review: 0, observed: 1, validated: 2 }

const helper = createColumnHelper()

const columns = helper.columns([
  helper.accessor('contractNumber', {
    header: 'Contrato',
    cell: ({ row }) => (
      <Link
        to={ROUTES.contractReview(row.original.id)}
        className="font-medium underline-offset-4 hover:underline"
      >
        {row.original.contractNumber}
      </Link>
    ),
  }),
  // El valor "nombre NIT" permite que la búsqueda encuentre por ambos.
  helper.accessor((row) => `${row.counterpartyName} ${row.counterpartyNit}`, {
    id: 'counterparty',
    header: 'Contraparte',
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="truncate">{row.original.counterpartyName}</div>
        <div className="text-xs text-muted-foreground">NIT {row.original.counterpartyNit}</div>
      </div>
    ),
  }),
  helper.accessor((row) => CONTRACT_TYPE[row.type], {
    id: 'type',
    header: 'Tipo',
    meta: { hideBelow: 'xl' },
    cell: ({ getValue }) => getValue(),
  }),
  helper.accessor('amount', {
    header: 'Valor',
    meta: { align: 'right' },
    cell: ({ row }) => (
      <span className="tabular-nums">{formatCurrency(row.original.amount, row.original.currency)}</span>
    ),
  }),
  helper.accessor('endDate', {
    header: 'Vigencia',
    meta: { hideBelow: 'xl' },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-muted-foreground tabular-nums">
        hasta {formatDate(row.original.endDate)}
      </span>
    ),
  }),
  helper.accessor((row) => STATUS_RANK[row.status], {
    id: 'status',
    header: 'Estado',
    cell: ({ row }) => <ContractStatusBadge status={row.original.status} />,
  }),
  helper.display({
    id: 'actions',
    header: () => <span className="sr-only">Acciones</span>,
    meta: { align: 'right' },
    cell: ({ row }) => <ContractRowActions contract={row.original} />,
  }),
])

/* -------------------------------------------------------------------------- */
/* Componente                                                                  */
/* -------------------------------------------------------------------------- */

const STATUS_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'pending_review', label: 'Pendientes' },
  { value: 'observed', label: 'Observados' },
  { value: 'validated', label: 'Validados' },
]

export function ContractsTable({ contracts }) {
  const [status, setStatus] = useState('all')
  const [type, setType] = useState('all')
  const [search, setSearch] = useState('')

  const counts = useMemo(() => {
    const result = { all: contracts.length, pending_review: 0, observed: 0, validated: 0 }
    for (const contract of contracts) result[contract.status] += 1
    return result
  }, [contracts])

  const data = useMemo(
    () =>
      contracts.filter(
        (c) => (status === 'all' || c.status === status) && (type === 'all' || c.type === type),
      ),
    [contracts, status, type],
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
    <Tabs value={status} onValueChange={setStatus}>
      {/* Estado: pestañas desde 640px; en móvil, un selector (las 4 pestañas no caben). */}
      <TabsList variant="neumorphic" aria-label="Filtrar por estado de validación" className="hidden sm:inline-flex">
        {STATUS_FILTERS.map(({ value, label }) => (
          <TabsTrigger key={value} value={value} className="gap-1.5">
            {value !== 'all' && (
              <span
                aria-hidden
                className={cn(
                  'size-2 rounded-full',
                  value === 'pending_review' && 'bg-warning',
                  value === 'observed' && 'bg-danger',
                  value === 'validated' && 'bg-success',
                )}
              />
            )}
            {label}
            <span className="text-xs text-muted-foreground tabular-nums">{counts[value]}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      <NativeSelect
        aria-label="Estado de validación"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        wrapperClassName="sm:hidden"
      >
        {STATUS_FILTERS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label} ({counts[value]})
          </option>
        ))}
      </NativeSelect>

      <div className="mt-2 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
        <NativeSelect aria-label="Tipo de contrato" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">Todos los tipos</option>
          {Object.entries(CONTRACT_TYPE).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>

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
            placeholder="Buscar contrato, contraparte o NIT"
            aria-label="Buscar contratos"
            className="h-9 pl-8"
          />
        </div>
      </div>

      <TabsContent value={status} className="mt-2">
        {/* Menos de 1024px: tarjetas. */}
        {rows.length === 0 ? (
          <p className="rounded-lg border bg-background py-10 text-center text-sm text-muted-foreground lg:hidden">
            No hay contratos que coincidan con los filtros.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:hidden">
            {rows.map((row) => (
              <ContractCard key={row.id} contract={row.original} />
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
                        className={cn(alignRight && 'text-right', HIDE_BELOW[header.column.columnDef.meta?.hideBelow])}
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
                    No hay contratos que coincidan con los filtros.
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

