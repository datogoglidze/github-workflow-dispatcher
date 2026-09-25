import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function JsonViewer({ value }: { value: unknown }) {
  const text = JSON.stringify(value ?? null, null, 2)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Copied")
    } catch {
      toast.error("Copy failed")
    }
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="xs"
        className="absolute top-2 right-2"
        onClick={() => void copy()}
      >
        Copy
      </Button>
      <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 pr-16 font-mono text-xs">
        {text}
      </pre>
    </div>
  )
}
