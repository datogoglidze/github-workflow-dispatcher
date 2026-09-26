import { useState } from "react"
import { toast } from "sonner"
import type { DispatchLog, Schedule } from "@/api/types"
import { triggerSchedule } from "@/api/schedules"
import { CronBadge } from "@/components/cron-badge"
import { DispatchResultPanel, toastDispatchResult } from "@/components/dispatch-result"
import { formatInputCount } from "@/components/json-inputs-field"
import { JsonViewer } from "@/components/json-viewer"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
export function TriggerScheduleModal({
  schedule,
  open,
  onOpenChange,
  onDone,
}: {
  schedule: Schedule | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone?: () => void
}) {
  const [pending, setPending] = useState(false)
  const [log, setLog] = useState<DispatchLog | null>(null)
  const resetKey = `${open ? "1" : "0"}:${schedule?.id ?? ""}`
  const [seenKey, setSeenKey] = useState(resetKey)
  if (seenKey !== resetKey) {
    setSeenKey(resetKey)
    if (open) setLog(null)
  }

  const requestClose = (next: boolean) => {
    if (pending) return
    onOpenChange(next)
  }

  const run = async () => {
    if (!schedule) return
    setPending(true)
    try {
      const result = await triggerSchedule(schedule.id)
      setLog(result)
      toastDispatchResult(result)
      onDone?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed"
      toast.error(`Dispatch failed: ${message}`)
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogContent
        className="sm:max-w-lg"
        showCloseButton={!pending}
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault()
        }}
        onPointerDownOutside={(event) => {
          if (pending) event.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>Trigger Schedule</DialogTitle>
          <DialogDescription>Run this schedule once, right now.</DialogDescription>
        </DialogHeader>
        {schedule ? (
          <div className="space-y-2 text-xs">
            <p className="text-sm font-medium">{schedule.workflow.name}</p>
            <p className="text-muted-foreground">{schedule.workflow.repository.full_name}</p>
            <p>
              <span className="text-muted-foreground">Ref </span>
              <span className="font-mono">{schedule.ref ?? "default branch"}</span>
            </p>
            <CronBadge expression={schedule.cron_expression} />
            <p className="text-muted-foreground">{formatInputCount(schedule.inputs)}</p>
            <JsonViewer value={schedule.inputs ?? {}} />
            {log ? <DispatchResultPanel log={log} /> : null}
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={() => void run()} disabled={pending || !schedule}>
            {pending ? "Executing…" : "Execute Now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
