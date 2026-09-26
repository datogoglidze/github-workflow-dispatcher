import { Link } from "react-router-dom"
import type { DispatchLog } from "@/api/types"
import { StatusCodeBadge } from "@/components/badges"
import { CronBadge } from "@/components/cron-badge"
import { ExternalAnchor } from "@/components/external-anchor"
import { JsonViewer } from "@/components/json-viewer"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { formatDate, formatRelativeTime, formatUtcDate } from "@/lib/utils"

function payloadValue(value: unknown): unknown {
  if (typeof value !== "string") return value
  try {
    return JSON.parse(value) as unknown
  } catch {
    return value
  }
}

function hasPayload(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === "string" && value.trim() === "") return false
  return true
}

export function LogDetailsDrawer({
  log,
  open,
  onOpenChange,
}: {
  log: DispatchLog | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const target = log?.target ?? null
  const live = log?.schedule ?? null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="data-[side=right]:w-full data-[side=right]:overflow-y-auto data-[side=right]:sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Dispatch log</SheetTitle>
          <SheetDescription>
            {log ? formatRelativeTime(log.triggered_at) : "Details"}
          </SheetDescription>
        </SheetHeader>
        {log ? (
          <div className="space-y-4 px-4 pb-4">
            <div className="space-y-1 text-xs">
              <p className="text-sm font-medium">Triggered</p>
              <p>{formatDate(log.triggered_at)}</p>
              <p className="text-muted-foreground">{formatRelativeTime(log.triggered_at)}</p>
              <p className="text-muted-foreground">{formatUtcDate(log.triggered_at)} UTC</p>
            </div>
            <div className="space-y-1 text-xs">
              <p className="text-sm font-medium">Live schedule</p>
              {live ? (
                <Link
                  className="text-primary hover:underline"
                  to={`/schedules?${new URLSearchParams({
                    "workflow.name[eq]": live.workflow.name,
                    "workflow.repository.full_name[eq]": live.workflow.repository.full_name,
                  }).toString()}`}
                >
                  {live.workflow.name} · {live.cron_expression}
                </Link>
              ) : log.schedule_id ? (
                <p>Deleted</p>
              ) : (
                <p>None (manual run)</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusCodeBadge code={log.status_code} />
              {log.run_url ? (
                <a
                  href={log.run_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  View run on GitHub
                </a>
              ) : null}
            </div>
            {target ? (
              <div className="space-y-2 rounded-md border p-3 text-xs">
                <p className="text-sm font-medium">What ran</p>
                <p>
                  <span className="text-muted-foreground">Repository </span>
                  {target.repository_url ? (
                    <ExternalAnchor href={target.repository_url}>
                      {target.repository_full_name}
                    </ExternalAnchor>
                  ) : (
                    target.repository_full_name
                  )}
                </p>
                <p>
                  <span className="text-muted-foreground">Workflow </span>
                  {target.workflow_url ? (
                    <ExternalAnchor href={target.workflow_url}>{target.workflow_name}</ExternalAnchor>
                  ) : (
                    target.workflow_name
                  )}
                </p>
                <p className="font-mono text-muted-foreground">{target.workflow_path}</p>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Trigger</span>
                  <CronBadge expression={target.cron_expression} />
                </div>
                <p>
                  <span className="text-muted-foreground">Requested ref </span>
                  <span className="font-mono">{target.ref ?? "default branch"}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Sent ref </span>
                  <span className="font-mono">{target.resolved_ref ?? "—"}</span>
                </p>
                <JsonViewer value={target.inputs ?? {}} />
              </div>
            ) : null}
            {log.error_message ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                {log.error_message}
              </div>
            ) : null}
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Response</p>
              {hasPayload(log.response_payload) ? (
                <JsonViewer value={payloadValue(log.response_payload)} />
              ) : (
                <p className="text-xs text-muted-foreground">
                  No payload returned (typical for HTTP 204)
                </p>
              )}
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
