import { useState } from "react"
import { toast } from "sonner"
import type { DispatchLog, Workflow } from "@/api/types"
import { triggerWorkflow } from "@/api/workflows"
import { DispatchResultPanel, toastDispatchResult } from "@/components/dispatch-result"
import { JsonInputsField, parseInputs } from "@/components/json-inputs-field"
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

  const run = async () => {
    if (!workflow || !parsed.ok) return
    setPending(true)
    try {
      const body: { ref?: string; inputs?: Record<string, unknown> } = {}
      if (refValue.trim()) body.ref = refValue.trim()
      if (parsed.value) body.inputs = parsed.value
      const result = await triggerWorkflow(workflow.id, body)
      setLog(result)
      toastDispatchResult(result)
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
            <JsonInputsField
              id="workflow-inputs"
              value={inputsText}
              onChange={setInputsText}
              disabled={pending}
            />
            {log ? <DispatchResultPanel log={log} /> : null}
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
