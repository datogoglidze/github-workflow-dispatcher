import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { listLogs } from "@/api/logs"
import type { DispatchLog } from "@/api/types"
import { StatusCodeBadge } from "@/components/badges"
import { CronBadge } from "@/components/cron-badge"
import { ColumnFilterRow } from "@/components/data-table/column-filter-row"
import { DataTableCard } from "@/components/data-table/data-table-card"
import { Pagination } from "@/components/data-table/pagination"
import { SortableHeader } from "@/components/data-table/sortable-header"
import { TableSkeleton } from "@/components/data-table/table-skeleton"
import { ExternalAnchor } from "@/components/external-anchor"
import { formatInputCount } from "@/components/json-inputs-field"
import { LogDetailsDrawer } from "@/components/log-details-drawer"
import { RelativeTime } from "@/components/relative-time"
import { Button } from "@/components/ui/button"
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

const filterColumns = [
  { key: "status_code", type: "text" as const, op: "eq" as const },
  { key: "workflow_name", type: "text" as const },
  { key: "repository_full_name", type: "text" as const },
  { key: "resolved_ref", type: "text" as const },
]

const columns = [
  {
    id: "status",
    label: "HTTP Status",
    sortField: "status_code",
    filter: "text" as const,
    filterKey: "status_code",
  },
  { id: "run", label: "Run" },
  { id: "triggered", label: "Triggered", sortField: "triggered_at" },
  {
    id: "workflow",
    label: "Workflow",
    sortField: "workflow_name",
    filter: "text" as const,
    filterKey: "workflow_name",
  },
  {
    id: "repository",
    label: "Repository",
    sortField: "repository_full_name",
    filter: "text" as const,
    filterKey: "repository_full_name",
  },
  { id: "trigger", label: "Trigger" },
  {
    id: "ref",
    label: "Ref",
    sortField: "resolved_ref",
    filter: "text" as const,
    filterKey: "resolved_ref",
  },
  { id: "inputs", label: "Inputs" },
  { id: "inspect", label: "Inspect" },
]

function readFilter(params: URLSearchParams, key: string) {
  const exact = params.get(`${key}[eq]`)
  if (exact != null && exact !== "") return exact
  return params.get(`${key}[ilike]`)?.replace(/^%|%$/g, "") ?? ""
}

export function LogsPage() {
  const [searchParams] = useSearchParams()
  const [initialFilters] = useState<Record<string, string>>(() => {
    const filters: Record<string, string> = {}
    for (const column of filterColumns) {
      const value = readFilter(searchParams, column.key)
      if (value) filters[column.key] = value
    }
    return filters
  })
  const { refreshKey } = useAppOutlet()
  const columnFilters = useColumnFilters(filterColumns, initialFilters)
  const { sort, toggle } = useSort("-triggered_at")
  const { pageSize, setPageSize, page, setPage, limit, offset } = usePagination()
  const [selected, setSelected] = useState<DispatchLog | null>(null)
  const filterKey = JSON.stringify(columnFilters.params)
  const queryKey = `${filterKey}|${sort ?? ""}`
  const [seenQuery, setSeenQuery] = useState(queryKey)
  if (seenQuery !== queryKey) {
    setSeenQuery(queryKey)
    if (page !== 0) setPage(0)
  }

  const { data, error, loading } = useFetch(
    () =>
      listLogs({
        limit,
        offset,
        ...(sort ? { sort } : {}),
        ...columnFilters.params,
      }),
    [refreshKey, limit, offset, sort, filterKey],
  )

  const rows = data?.logs ?? []

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Dispatch Logs</h1>
      <DataTableCard
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
                    No logs
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((log) => {
                  const target = log.target
                  return (
                    <TableRow
                      key={log.id}
                      className="cursor-pointer"
                      onClick={() => setSelected(log)}
                    >
                      <TableCell>
                        <StatusCodeBadge code={log.status_code} />
                      </TableCell>
                      <TableCell>
                        {log.run_url ? (
                          <a
                            href={log.run_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline"
                            onClick={(event) => event.stopPropagation()}
                          >
                            View run
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <RelativeTime value={log.triggered_at} />
                      </TableCell>
                      <TableCell>
                        {target?.workflow_url ? (
                          <span onClick={(event) => event.stopPropagation()}>
                            <ExternalAnchor href={target.workflow_url}>{target.workflow_name}</ExternalAnchor>
                          </span>
                        ) : (
                          (target?.workflow_name ?? "—")
                        )}
                      </TableCell>
                      <TableCell>
                        {target?.repository_url ? (
                          <span onClick={(event) => event.stopPropagation()}>
                            <ExternalAnchor href={target.repository_url}>
                              {target.repository_full_name}
                            </ExternalAnchor>
                          </span>
                        ) : (
                          (target?.repository_full_name ?? "—")
                        )}
                      </TableCell>
                      <TableCell>
                        <CronBadge expression={target?.cron_expression ?? null} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-mono">{target?.resolved_ref ?? "—"}</span>
                          {target && target.ref == null ? (
                            <span className="text-muted-foreground">default branch</span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{formatInputCount(target?.inputs)}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={(event) => {
                            event.stopPropagation()
                            setSelected(log)
                          }}
                        >
                          Inspect
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        )}
        <Pagination
          page={page}
          onPage={setPage}
          count={data?.count ?? 0}
          total={data?.total ?? 0}
          pageSize={pageSize}
          onPageSize={setPageSize}
        />
      </DataTableCard>
      <LogDetailsDrawer
        log={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      />
    </div>
  )
}
