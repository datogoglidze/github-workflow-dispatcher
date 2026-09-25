import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SyncReposButton({
  label,
  syncing,
  onSync,
}: {
  label: string
  syncing: boolean
  onSync: () => Promise<void>
}) {
  return (
    <Button
      type="button"
      size="sm"
      onClick={() => void onSync()}
      disabled={syncing}
    >
      <RefreshCw className={syncing ? "animate-spin" : undefined} />
      {label}
    </Button>
  )
}
