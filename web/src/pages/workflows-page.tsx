import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import type { Workflow } from "@/api/types"
import { listWorkflows } from "@/api/workflows"
import { WorkflowStateBadge } from "@/components/badges"
import { ColumnFilterRow } from "@/components/data-table/column-filter-row"
import { DataTableCard } from "@/components/data-table/data-table-card"
import { Pagination } from "@/components/data-table/pagination"
import { SortableHeader } from "@/components/data-table/sortable-header"
import { TableSkeleton } from "@/components/data-table/table-skeleton"
import { ExternalAnchor } from "@/components/external-anchor"
import { RunWorkflowModal } from "@/components/run-workflow-modal"
import { ScheduleModal } from "@/components/schedule-modal"
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
  { key: "name", type: "text" as const },
  { key: "repository.full_name", type: "text" as const },
]

const columns = [
  { id: "name", label: "Title", sortField: "name", filter: "text" as const },
  {
    id: "repository",
    label: "Repository",
    sortField: "repository.full_name",
    filter: "text" as const,
    filterKey: "repository.full_name",
  },
  { id: "state", label: "State", sortField: "state" },
  { id: "actions", label: "Actions" },
]

function initialRepositoryFilter(params: URLSearchParams) {
  const exact = params.get("repository.full_name[eq]")
  if (exact) return exact
  return params.get("repository.full_name[ilike]")?.replace(/^%|%$/g, "") ?? ""
}

export function WorkflowsPage() {
  const [searchParams] = useSearchParams()
  const [initialFilters] = useState<Record<string, string>>(() => {
    const repository = initialRepositoryFilter(searchParams)
    const filters: Record<string, string> = {}
    if (repository) filters["repository.full_name"] = repository
    return filters
  })
  const { refreshKey } = useAppOutlet()
  const columnFilters = useColumnFilters(filterColumns, initialFilters)
  const { sort, toggle } = useSort("name")
  const { pageSize, setPageSize, page, setPage, limit, offset } = usePagination()
  const [selected, setSelected] = useState<Workflow | null>(null)
  const [scheduleTarget, setScheduleTarget] = useState<Workflow | null>(null)
  const filterKey = JSON.stringify(columnFilters.params)
  const queryKey = `${filterKey}|${sort ?? ""}`
  const [seenQuery, setSeenQuery] = useState(queryKey)
  if (seenQuery !== queryKey) {
    setSeenQuery(queryKey)
    if (page !== 0) setPage(0)
  }

  const { data, error, loading } = useFetch(
    () =>
      listWorkflows({
        limit,
        offset,
        "is_dispatchable[eq]": true,
        ...(sort ? { sort } : {}),
        ...columnFilters.params,
      }),
    [refreshKey, limit, offset, sort, filterKey],
  )

  const rows = data?.workflows ?? []

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Workflows</h1>
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
                    No workflows
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((workflow) => (
                  <TableRow key={workflow.id}>
                    <TableCell>
                      <ExternalAnchor href={workflow.url}>{workflow.name}</ExternalAnchor>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <ExternalAnchor href={workflow.repository.url}>
                          {workflow.repository.full_name}
                        </ExternalAnchor>
                        <span className="font-mono text-muted-foreground">
                          branch: {workflow.repository.default_branch}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <WorkflowStateBadge state={workflow.state} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {workflow.state === "active" ? (
                          <Button type="button" size="xs" onClick={() => setSelected(workflow)}>
                            Run
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={() => setScheduleTarget(workflow)}
                        >
                          Schedule
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
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
      <RunWorkflowModal
        workflow={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      />
      <ScheduleModal
        workflow={scheduleTarget}
        open={scheduleTarget !== null}
        onOpenChange={(open) => {
          if (!open) setScheduleTarget(null)
        }}
      />
    </div>
  )
}
