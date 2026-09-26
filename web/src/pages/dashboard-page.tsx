import { useState } from "react"
import { Link } from "react-router-dom"
import { Play } from "lucide-react"
import { listLogs } from "@/api/logs"
import { listRepositories } from "@/api/repositories"
import { listSchedules } from "@/api/schedules"
import type { DispatchLog, Schedule } from "@/api/types"
import { listWorkflows } from "@/api/workflows"
import { StatusCodeBadge } from "@/components/badges"
import { CronBadge } from "@/components/cron-badge"
import { TableSkeleton } from "@/components/data-table/table-skeleton"
import { ExternalAnchor } from "@/components/external-anchor"
import { LogDetailsDrawer } from "@/components/log-details-drawer"
import { RelativeTime } from "@/components/relative-time"
import { ScheduleModal } from "@/components/schedule-modal"
import { TriggerScheduleModal } from "@/components/trigger-schedule-modal"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAppOutlet } from "@/hooks/use-app-outlet"
import { useFetch } from "@/hooks/use-fetch"

function MetricCard({
  title,
  to,
  total,
  loading,
}: {
  title: string
  to: string
  total: number | undefined
  loading: boolean
}) {
  return (
    <Link to={to} className="block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50">
      <Card size="sm" className="h-full hover:bg-muted/40">
        <CardHeader>
          <CardDescription>{title}</CardDescription>
          <CardTitle className="text-2xl tabular-nums">
            {loading && total == null ? <Skeleton className="h-8 w-12" /> : (total ?? 0)}
          </CardTitle>
        </CardHeader>
      </Card>
    </Link>
  )
}

function WorkflowRepo({
  name,
  nameHref,
  repo,
  repoHref,
}: {
  name: string
  nameHref: string | null | undefined
  repo: string
  repoHref: string | null | undefined
}) {
  return (
    <div className="flex flex-col">
      {nameHref ? <ExternalAnchor href={nameHref}>{name}</ExternalAnchor> : <span>{name}</span>}
      {repoHref ? (
        <ExternalAnchor href={repoHref}>{repo}</ExternalAnchor>
      ) : (
        <span className="text-muted-foreground">{repo}</span>
      )}
    </div>
  )
}

export function DashboardPage() {
  const { refreshKey } = useAppOutlet()
  const [creating, setCreating] = useState(false)
  const [revision, setRevision] = useState(0)
  const [triggering, setTriggering] = useState<Schedule | null>(null)
  const [selectedLog, setSelectedLog] = useState<DispatchLog | null>(null)

  const schedules = useFetch(() => listSchedules({ limit: 1 }), [refreshKey, revision])
  const workflows = useFetch(
    () => listWorkflows({ limit: 1, "is_dispatchable[eq]": "true" }),
    [refreshKey],
  )
  const repositories = useFetch(() => listRepositories({ limit: 1 }), [refreshKey])
  const logsTotal = useFetch(() => listLogs({ limit: 1 }), [refreshKey, revision])
  const upcoming = useFetch(
    () =>
      listSchedules({
        limit: 5,
        sort: "next_run_at",
        "is_enabled[eq]": "true",
      }),
    [refreshKey, revision],
  )
  const recent = useFetch(() => listLogs({ limit: 6 }), [refreshKey, revision])

  const upcomingRows = upcoming.data?.schedules ?? []
  const recentRows = recent.data?.logs ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">GitHub Actions Orchestration</h1>
        <Button type="button" size="sm" onClick={() => setCreating(true)}>
          New Schedule
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Schedules"
          to="/schedules"
          total={schedules.data?.total}
          loading={schedules.loading}
        />
        <MetricCard
          title="Dispatchable Workflows"
          to="/workflows"
          total={workflows.data?.total}
          loading={workflows.loading}
        />
        <MetricCard
          title="Connected Repos"
          to="/repositories"
          total={repositories.data?.total}
          loading={repositories.loading}
        />
        <MetricCard
          title="Execution Logs"
          to="/logs"
          total={logsTotal.data?.total}
          loading={logsTotal.loading}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <Card size="sm">
          <CardHeader className="border-b">
            <CardTitle>Upcoming Executions</CardTitle>
          </CardHeader>
          <div className="px-(--card-spacing)">
            {upcoming.error ? (
              <p className="pb-3 text-xs text-destructive">{upcoming.error.message}</p>
            ) : null}
            {upcoming.loading && !upcoming.data ? (
              <TableSkeleton rows={5} columns={4} />
            ) : (
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead>Workflow</TableHead>
                    <TableHead>Cron</TableHead>
                    <TableHead>Next Run</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground">
                        No upcoming executions
                      </TableCell>
                    </TableRow>
                  ) : (
                    upcomingRows.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell>
                          <WorkflowRepo
                            name={schedule.workflow.name}
                            nameHref={schedule.workflow.url}
                            repo={schedule.workflow.repository.full_name}
                            repoHref={schedule.workflow.repository.url}
                          />
                        </TableCell>
                        <TableCell>
                          <CronBadge expression={schedule.cron_expression} />
                        </TableCell>
                        <TableCell>
                          <RelativeTime value={schedule.next_run_at} />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="icon-xs"
                            variant="outline"
                            aria-label={`Run ${schedule.workflow.name}`}
                            onClick={() => setTriggering(schedule)}
                          >
                            <Play />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </Card>

        <Card size="sm">
          <CardHeader className="border-b">
            <CardTitle>Recent Dispatches</CardTitle>
          </CardHeader>
          <div className="px-(--card-spacing)">
            {recent.error ? (
              <p className="pb-3 text-xs text-destructive">{recent.error.message}</p>
            ) : null}
            {recent.loading && !recent.data ? (
              <TableSkeleton rows={6} columns={4} />
            ) : (
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead>Workflow</TableHead>
                    <TableHead>Run</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground">
                        No dispatches
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentRows.map((log) => {
                      const target = log.target
                      return (
                        <TableRow
                          key={log.id}
                          className="cursor-pointer"
                          onClick={() => setSelectedLog(log)}
                        >
                          <TableCell>
                            <StatusCodeBadge code={log.status_code} />
                          </TableCell>
                          <TableCell>
                            <RelativeTime value={log.triggered_at} />
                          </TableCell>
                          <TableCell onClick={(event) => event.stopPropagation()}>
                            <WorkflowRepo
                              name={target?.workflow_name ?? "—"}
                              nameHref={target?.workflow_url}
                              repo={target?.repository_full_name ?? "—"}
                              repoHref={target?.repository_url}
                            />
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
                                Run
                              </a>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </Card>
      </div>

      <ScheduleModal
        open={creating}
        schedule={null}
        onOpenChange={(open) => {
          if (!open) setCreating(false)
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
      <LogDetailsDrawer
        log={selectedLog}
        open={selectedLog !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedLog(null)
        }}
      />
    </div>
  )
}
