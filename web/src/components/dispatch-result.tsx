import { toast } from "sonner"
import type { DispatchLog } from "@/api/types"
import { StatusCodeBadge } from "@/components/badges"
import { JsonViewer } from "@/components/json-viewer"

export function dispatchSucceeded(log: DispatchLog) {
  return log.status_code === 200 || log.status_code === 204
}

export function toastDispatchResult(log: DispatchLog) {
  if (dispatchSucceeded(log)) {
    toast.success("Workflow dispatched", {
      action: log.run_url
        ? {
            label: "View run on GitHub",
            onClick: () => window.open(log.run_url ?? "", "_blank", "noopener,noreferrer"),
          }
        : undefined,
    })
    return
  }
  toast.error(
    `Dispatch failed: ${log.error_message?.trim() || `status ${log.status_code ?? "unknown"}`}`,
  )
}

export function DispatchResultPanel({ log }: { log: DispatchLog }) {
  return (
    <div className="space-y-2 rounded-md border p-3">
      <StatusCodeBadge code={log.status_code} />
      {log.run_url ? (
        <a
          href={log.run_url}
          target="_blank"
          rel="noreferrer"
          className="block text-xs text-primary hover:underline"
        >
          View run on GitHub
        </a>
      ) : null}
      {log.error_message ? (
        <p className="text-xs text-destructive">{log.error_message}</p>
      ) : null}
      <JsonViewer value={log.response_payload} />
    </div>
  )
}
