import { useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { deleteSchedule, listSchedules, updateSchedule } from "@/api/schedules"
import type { Schedule } from "@/api/types"
import { CronBadge } from "@/components/cron-badge"
import { ColumnFilterRow } from "@/components/data-table/column-filter-row"
import { DataTableCard } from "@/components/data-table/data-table-card"
import { Pagination } from "@/components/data-table/pagination"
import { SortableHeader } from "@/components/data-table/sortable-header"
import { TableSkeleton } from "@/components/data-table/table-skeleton"
import { ExternalAnchor } from "@/components/external-anchor"
import { formatInputCount } from "@/components/json-inputs-field"
import { RelativeTime } from "@/components/relative-time"
import { ScheduleModal } from "@/components/schedule-modal"
import { TriggerScheduleModal } from "@/components/trigger-schedule-modal"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
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
  { key: "is_enabled", type: "boolean" as const },
  { key: "workflow.name", type: "text" as const },
  { key: "workflow.repository.full_name", type: "text" as const },
]

const columns = [
  {
    id: "active",
    label: "Active",
    sortField: "is_enabled",
    filter: "boolean" as const,
    filterKey: "is_enabled",
  },
  {
    id: "workflow",
    label: "Workflow",
    sortField: "workflow.name",
    filter: "text" as const,
    filterKey: "workflow.name",
  },
  {
    id: "repository",
    label: "Repository",
    sortField: "workflow.repository.full_name",
    filter: "text" as const,
    filterKey: "workflow.repository.full_name",
  },
  { id: "cron", label: "Cron", sortField: "cron_expression" },
  { id: "ref", label: "Git Ref", sortField: "ref" },
  { id: "last_run", label: "Last Run", sortField: "last_run_at" },
  { id: "next_run", label: "Next Run", sortField: "next_run_at" },
  { id: "inputs", label: "Inputs" },
  { id: "actions", label: "Actions" },
]

function readFilter(params: URLSearchParams, key: string) {
  const exact = params.get(`${key}[eq]`)
  if (exact != null && exact !== "") return exact
  return params.get(`${key}[ilike]`)?.replace(/^%|%$/g, "") ?? ""
}

export function SchedulesPage() {
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
  const { sort, toggle } = useSort("next_run_at")
  const { pageSize, setPageSize, page, setPage, limit, offset } = usePagination()
  const [revision, setRevision] = useState(0)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Schedule | null>(null)
  const [triggering, setTriggering] = useState<Schedule | null>(null)
  const [deleting, setDeleting] = useState<Schedule | null>(null)
  const [deletePending, setDeletePending] = useState(false)
  const [enabledOverride, setEnabledOverride] = useState<Record<string, boolean>>({})
  const [pendingToggle, setPendingToggle] = useState<string | null>(null)
  const filterKey = JSON.stringify(columnFilters.params)
  const queryKey = `${filterKey}|${sort ?? ""}`
  const [seenQuery, setSeenQuery] = useState(queryKey)
  if (seenQuery !== queryKey) {
    setSeenQuery(queryKey)
    if (page !== 0) setPage(0)
  }

  const { data, error, loading } = useFetch(
    () =>
      listSchedules({
        limit,
        offset,
        ...(sort ? { sort } : {}),
        ...columnFilters.params,
      }),
    [refreshKey, revision, limit, offset, sort, filterKey],
  )

  const rows = data?.schedules ?? []

  const toggleEnabled = async (schedule: Schedule, enabled: boolean) => {
    setEnabledOverride((current) => ({ ...current, [schedule.id]: enabled }))
    setPendingToggle(schedule.id)
    try {
      await updateSchedule(schedule.id, { is_enabled: enabled })
      toast.success(enabled ? "Schedule enabled" : "Schedule disabled")
      setRevision((current) => current + 1)
    } catch (caught) {
      setEnabledOverride((current) => {
        const next = { ...current }
        delete next[schedule.id]
        return next
      })
      const message = caught instanceof Error ? caught.message : "Request failed"
      toast.error(message)
    } finally {
      setPendingToggle(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setDeletePending(true)
    try {
      await deleteSchedule(deleting.id)
      toast.success("Schedule deleted")
      setDeleting(null)
      setRevision((current) => current + 1)
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Request failed"
      toast.error(message)
    } finally {
      setDeletePending(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Schedules</h1>
        <Button type="button" size="sm" onClick={() => setCreating(true)}>
          Create Schedule
        </Button>
      </div>
      <DataTableCard
        title="Schedules"
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
                    No schedules
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((schedule) => {
                  const enabled =
                    schedule.id in enabledOverride
                      ? enabledOverride[schedule.id]
                      : schedule.is_enabled
                  const logsSearch = new URLSearchParams({
                    "workflow_name[eq]": schedule.workflow.name,
                    "repository_full_name[eq]": schedule.workflow.repository.full_name,
                  })
                  return (
                    <TableRow key={schedule.id}>
                      <TableCell>
                        <Switch
                          checked={enabled}
                          disabled={pendingToggle === schedule.id}
                          aria-label={`Active ${schedule.workflow.name}`}
                          onCheckedChange={(checked) => void toggleEnabled(schedule, checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <ExternalAnchor href={schedule.workflow.url}>
                          {schedule.workflow.name}
                        </ExternalAnchor>
                      </TableCell>
                      <TableCell>
                        <ExternalAnchor href={schedule.workflow.repository.url}>
                          {schedule.workflow.repository.full_name}
                        </ExternalAnchor>
                      </TableCell>
                      <TableCell>
                        <CronBadge expression={schedule.cron_expression} />
                      </TableCell>
                      <TableCell className="font-mono">
                        {schedule.ref ?? "default branch"}
                      </TableCell>
                      <TableCell>
                        <RelativeTime value={schedule.last_run_at} />
                      </TableCell>
                      <TableCell>
                        <RelativeTime value={schedule.next_run_at} />
                      </TableCell>
                      <TableCell>{formatInputCount(schedule.inputs)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          <Button type="button" size="xs" onClick={() => setTriggering(schedule)}>
                            Trigger
                          </Button>
                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            onClick={() => setEditing(schedule)}
                          >
                            Edit
                          </Button>
                          <Button type="button" size="xs" variant="outline" asChild>
                            <Link to={`/logs?${logsSearch.toString()}`}>Logs</Link>
                          </Button>
                          <Button
                            type="button"
                            size="xs"
                            variant="destructive"
                            onClick={() => setDeleting(schedule)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
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
      <ScheduleModal
        open={creating || editing !== null}
        schedule={editing}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false)
            setEditing(null)
          }
        }}
        onSaved={() => setRevision((current) => current + 1)}
      />
      <TriggerScheduleModal
        schedule={triggering}
        open={triggering !== null}
        onOpenChange={(open) => {
          if (!open) setTriggering(null)
        }}
        onDone={() => setRevision((current) => current + 1)}
      />
      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open && !deletePending) setDeleting(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? `Remove the schedule for ${deleting.workflow.name}. Dispatch logs are kept.`
                : "Remove this schedule. Dispatch logs are kept."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletePending}
              onClick={(event) => {
                event.preventDefault()
                void confirmDelete()
              }}
            >
              {deletePending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
