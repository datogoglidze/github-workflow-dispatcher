import { useState } from "react"
import { toast } from "sonner"
import type { Schedule, Workflow } from "@/api/types"
import { createSchedule, updateSchedule } from "@/api/schedules"
import {
  inputsJsonText,
  JsonInputsField,
  parseInputs,
} from "@/components/json-inputs-field"
import { WorkflowSelect } from "@/components/workflow-select"
import { Badge } from "@/components/ui/badge"
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
import { Switch } from "@/components/ui/switch"
import { CRON_PRESETS, explainCronDual, isValidCron } from "@/lib/cron"

export function ScheduleModal({
  open,
  onOpenChange,
  schedule,
  workflow,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  schedule?: Schedule | null
  workflow?: Workflow | null
  onSaved?: () => void
}) {
  const editing = schedule ?? null
  const [selected, setSelected] = useState<Workflow | null>(null)
  const [cron, setCron] = useState("0 0 * * *")
  const [refValue, setRefValue] = useState("")
  const [inputsText, setInputsText] = useState("")
  const [isEnabled, setIsEnabled] = useState(true)
  const [pending, setPending] = useState(false)
  const parsed = parseInputs(inputsText)
  const cronValid = isValidCron(cron)
  const explanation = cronValid ? explainCronDual(cron) : null
  const resetKey = `${open ? "1" : "0"}:${editing?.id ?? ""}:${workflow?.id ?? ""}`
  const [seenKey, setSeenKey] = useState(resetKey)
  if (seenKey !== resetKey) {
    setSeenKey(resetKey)
    if (open) {
      setSelected(editing?.workflow ?? workflow ?? null)
      setCron(editing?.cron_expression ?? "0 0 * * *")
      setRefValue(editing?.ref ?? "")
      setInputsText(inputsJsonText(editing?.inputs))
      setIsEnabled(editing?.is_enabled ?? true)
    }
  }

  const requestClose = (next: boolean) => {
    if (pending) return
    onOpenChange(next)
  }

  const save = async () => {
    if (!selected || !cronValid || !parsed.ok) return
    setPending(true)
    const ref = refValue.trim() ? refValue.trim() : null
    const inputs = parsed.value ?? null
    try {
      if (editing) {
        await updateSchedule(editing.id, {
          cron_expression: cron.trim(),
          ref,
          inputs,
          is_enabled: isEnabled,
        })
        toast.success("Schedule updated")
      } else {
        await createSchedule({
          workflow_id: selected.id,
          cron_expression: cron.trim(),
          ref,
          inputs,
          is_enabled: isEnabled,
        })
        toast.success("Schedule created")
      }
      onSaved?.()
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed"
      toast.error(message)
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-lg"
        showCloseButton={!pending}
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault()
        }}
        onPointerDownOutside={(event) => {
          if (pending) event.preventDefault()
        }}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>{editing ? "Edit Schedule" : "Create Schedule"}</DialogTitle>
          <DialogDescription>
            Cron expressions use five fields and run in UTC.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 space-y-3 overflow-y-auto">
          <div className="space-y-1.5">
            <Label>Workflow</Label>
            <WorkflowSelect value={selected} onChange={setSelected} disabled={pending || editing !== null} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="cron-expression">Cron</Label>
              <Badge variant={cronValid ? "default" : "destructive"}>
                {cronValid ? "Valid" : "Invalid"}
              </Badge>
            </div>
            <Input
              id="cron-expression"
              value={cron}
              onChange={(event) => setCron(event.target.value)}
              placeholder="0 8 * * *"
              className="font-mono"
              disabled={pending}
              aria-invalid={!cronValid}
            />
            <div className="flex flex-wrap gap-1">
              {CRON_PRESETS.map((preset) => (
                <Button
                  key={preset.expression}
                  type="button"
                  size="xs"
                  variant={cron === preset.expression ? "secondary" : "outline"}
                  onClick={() => setCron(preset.expression)}
                  disabled={pending}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            {explanation ? (
              <div className="space-y-1 rounded-md border bg-muted/40 p-3 text-xs">
                <p>
                  <span className="text-muted-foreground">UTC </span>
                  {explanation.utc}
                </p>
                <p>
                  <span className="text-muted-foreground">Your Time </span>
                  {explanation.local}
                </p>
              </div>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="schedule-ref">Git Ref</Label>
            <Input
              id="schedule-ref"
              value={refValue}
              onChange={(event) => setRefValue(event.target.value)}
              placeholder={selected?.repository.default_branch ?? "default branch"}
              className="font-mono"
              disabled={pending}
            />
          </div>
          <JsonInputsField
            id="schedule-inputs"
            value={inputsText}
            onChange={setInputsText}
            disabled={pending}
          />
          <div className="flex items-center justify-between gap-2 pr-3 pb-2">
            <Label htmlFor="schedule-active">Schedule Active</Label>
            <Switch
              id="schedule-active"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
              disabled={pending}
            />
          </div>
        </div>
        <DialogFooter className="shrink-0">
          <Button
            type="button"
            onClick={() => void save()}
            disabled={pending || !selected || !cronValid || !parsed.ok}
          >
            {pending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
