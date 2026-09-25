import { useState } from "react"
import { toast } from "sonner"
import type { DispatchLog, Workflow } from "@/api/types"
import { triggerWorkflow } from "@/api/workflows"
import { JsonViewer } from "@/components/json-viewer"
import { StatusCodeBadge } from "@/components/badges"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type InputsResult =
  | { ok: true; value?: Record<string, unknown> }
  | { ok: false; error: string }

function parseInputs(text: string): InputsResult {
  const trimmed = text.trim()
  if (!trimmed) return { ok: true }
  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, error: "Inputs must be a JSON object" }
    }
    return { ok: true, value: parsed as Record<string, unknown> }
  } catch {
    return { ok: false, error: "Invalid JSON" }
  }
}

function succeeded(log: DispatchLog) {
  return log.status_code === 200 || log.status_code === 204
}

export function RunWorkflowModal({
  workflow,
  open,
  onOpenChange,
}: {
  workflow: Workflow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [refValue, setRefValue] = useState("")
  const [inputsText, setInputsText] = useState("")
  const [pending, setPending] = useState(false)
  const [log, setLog] = useState<DispatchLog | null>(null)
  const parsed = parseInputs(inputsText)
  const resetKey = `${open ? "1" : "0"}:${workflow?.id ?? ""}`
  const [seenKey, setSeenKey] = useState(resetKey)
  if (seenKey !== resetKey) {
    setSeenKey(resetKey)
    if (open) {
      setRefValue("")
      setInputsText("")
      setLog(null)
    }
  }

  const requestClose = (next: boolean) => {
    if (pending) return
    onOpenChange(next)
  }

  const beautify = () => {
    if (!parsed.ok || !parsed.value) return
    setInputsText(JSON.stringify(parsed.value, null, 2))
  }

  const run = async () => {
    if (!workflow || !parsed.ok) return
    setPending(true)
    try {
      const body: { ref?: string; inputs?: Record<string, unknown> } = {}
      if (refValue.trim()) body.ref = refValue.trim()
      if (parsed.value) body.inputs = parsed.value
      const result = await triggerWorkflow(workflow.id, body)
      setLog(result)
      if (succeeded(result)) {
        toast.success("Workflow dispatched", {
          action: result.run_url
            ? {
                label: "View run on GitHub",
                onClick: () => window.open(result.run_url ?? "", "_blank", "noopener,noreferrer"),
              }
            : undefined,
        })
      } else {
        toast.error(
          `Dispatch failed: ${result.error_message?.trim() || `status ${result.status_code ?? "unknown"}`}`,
        )
      }
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
          <DialogTitle>Run Workflow</DialogTitle>
          <DialogDescription>
            Dispatch this workflow once, right now. No schedule is created.
          </DialogDescription>
        </DialogHeader>
        {workflow ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">{workflow.name}</p>
              <p className="font-mono text-xs text-muted-foreground">{workflow.path}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="git-ref">Git Ref</Label>
              <Input
                id="git-ref"
                value={refValue}
                onChange={(event) => setRefValue(event.target.value)}
                placeholder={workflow.repository.default_branch}
                className="font-mono"
                disabled={pending}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="workflow-inputs">Inputs</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={beautify}
                  disabled={pending || !parsed.ok || !parsed.value}
                >
                  Beautify JSON
                </Button>
              </div>
              <Textarea
                id="workflow-inputs"
                value={inputsText}
                onChange={(event) => setInputsText(event.target.value)}
                className="min-h-28 font-mono text-xs"
                placeholder="{}"
                disabled={pending}
                aria-invalid={!parsed.ok}
              />
              {!parsed.ok ? (
                <p className="text-xs text-destructive">{parsed.error}</p>
              ) : null}
            </div>
            {log ? (
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
            ) : null}
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={() => void run()} disabled={pending || !parsed.ok || !workflow}>
            {pending ? "Running…" : "Run Now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
