import { useState } from "react"
import { Link } from "react-router-dom"
import { listRepositories } from "@/api/repositories"
import { ActiveBadge } from "@/components/badges"
import { ColumnFilterRow } from "@/components/data-table/column-filter-row"
import { DataTableCard } from "@/components/data-table/data-table-card"
import { Pagination } from "@/components/data-table/pagination"
import { SortableHeader } from "@/components/data-table/sortable-header"
import { TableSkeleton } from "@/components/data-table/table-skeleton"
import { ExternalAnchor } from "@/components/external-anchor"
import { SyncReposButton } from "@/components/sync-repos-button"
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAppOutlet } from "@/hooks/use-app-outlet"
import { useColumnFilters } from "@/hooks/use-column-filters"
import { useFetch } from "@/hooks/use-fetch"
import { usePagination } from "@/hooks/use-pagination"
import { useSort } from "@/hooks/use-sort"
import { formatDate, formatRelativeTime } from "@/lib/utils"

const filters = [
  { key: "full_name", type: "text" as const },
  { key: "is_active", type: "boolean" as const },
]

const columns = [
  { id: "full_name", label: "Title", sortField: "full_name", filter: "text" as const },
  { id: "default_branch", label: "Default Branch", sortField: "default_branch" },
  { id: "is_active", label: "Status", sortField: "is_active", filter: "boolean" as const },
  { id: "last_synced_at", label: "Last Synced", sortField: "last_synced_at" },
  { id: "workflows", label: "" },
]

export function RepositoriesPage() {
  const { refreshKey, syncing, syncAndRefresh } = useAppOutlet()
  const columnFilters = useColumnFilters(filters)
  const { sort, toggle } = useSort("full_name")
  const { pageSize, setPageSize, page, setPage, limit, offset } = usePagination()
  const filterKey = JSON.stringify(columnFilters.params)
  const queryKey = `${filterKey}|${sort ?? ""}`
  const [seenQuery, setSeenQuery] = useState(queryKey)
  if (seenQuery !== queryKey) {
    setSeenQuery(queryKey)
    if (page !== 0) setPage(0)
  }

  const { data, error, loading } = useFetch(
    () =>
      listRepositories({
        limit,
        offset,
        ...(sort ? { sort } : {}),
        ...columnFilters.params,
      }),
    [refreshKey, limit, offset, sort, filterKey],
  )

  const rows = data?.repositories ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Connected Repositories</h1>
        <SyncReposButton
          label="Sync Repositories"
          syncing={syncing}
          onSync={syncAndRefresh}
        />
      </div>
      <DataTableCard
        title="Repositories"
        activeFilters={columnFilters.activeCount}
        onClear={columnFilters.clear}
      >
        {error ? <p className="text-xs text-destructive">{error.message}</p> : null}
        {loading && !data ? (
          <TableSkeleton columns={columns.length} />
        ) : (
          <Table className="text-xs">
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <SortableHeader
                    key={column.id}
                    label={column.label}
                    field={column.sortField}
                    sort={sort}
                    onToggle={toggle}
                  />
                ))}
              </TableRow>
              <ColumnFilterRow
                columns={columns}
                values={columnFilters.values}
                onChange={columnFilters.setValue}
              />
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-muted-foreground">
                    No repositories
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((repository) => (
                  <TableRow key={repository.id}>
                    <TableCell>
                      <ExternalAnchor href={repository.url}>{repository.full_name}</ExternalAnchor>
                    </TableCell>
                    <TableCell>
                      <span className="rounded border bg-muted px-1.5 py-0.5 font-mono">
                        {repository.default_branch}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ActiveBadge active={repository.is_active} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{formatRelativeTime(repository.last_synced_at)}</span>
                        <span className="text-muted-foreground">
                          {formatDate(repository.last_synced_at)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        className="text-primary hover:underline"
                        to={`/workflows?${new URLSearchParams({
                          "repository.full_name[eq]": repository.full_name,
                        }).toString()}`}
                      >
                        Workflows
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
        <Pagination
          offset={offset}
          count={data?.count ?? 0}
          total={data?.total ?? 0}
          pageSize={pageSize}
          onPageSize={setPageSize}
          onPrev={() => setPage((current) => Math.max(0, current - 1))}
          onNext={() => setPage((current) => current + 1)}
        />
      </DataTableCard>
    </div>
  )
}
