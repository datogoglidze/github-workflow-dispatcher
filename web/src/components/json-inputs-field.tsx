import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export type InputsResult =
  | { ok: true; value?: Record<string, unknown> }
  | { ok: false; error: string }

export function parseInputs(text: string): InputsResult {
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

export function formatInputCount(inputs: Record<string, unknown> | null | undefined): string {
  const count = inputs ? Object.keys(inputs).length : 0
  return `${count} ${count === 1 ? "key" : "keys"}`
}

export function JsonInputsField({
  id,
  value,
  onChange,
  disabled,
  className,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}) {
  const parsed = parseInputs(value)

  const beautify = () => {
    if (!parsed.ok || !parsed.value) return
    onChange(JSON.stringify(parsed.value, null, 2))
  }

  return (
    <div className={className || "space-y-1.5"}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>Inputs</Label>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={beautify}
          disabled={disabled || !parsed.ok || !parsed.value}
        >
          Beautify JSON
        </Button>
      </div>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-28 font-mono text-xs"
        placeholder="{}"
        disabled={disabled}
        aria-invalid={!parsed.ok}
      />
      {!parsed.ok ? <p className="text-xs text-destructive">{parsed.error}</p> : null}
    </div>
  )
}

export function inputsJsonText(inputs: Record<string, unknown> | null | undefined): string {
  if (!inputs || Object.keys(inputs).length === 0) return ""
  return JSON.stringify(inputs, null, 2)
}
