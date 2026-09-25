import { useEffect, useState } from "react"
import { getHealth } from "@/api/health"
import type { HealthStatus } from "@/api/types"
import { JsonViewer } from "@/components/json-viewer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

function isHealthy(status: string) {
  return !["error", "fail", "failed", "unhealthy", "down"].includes(status.toLowerCase())
}

function preview(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  if (value == null) return "—"
  return JSON.stringify(value)
}

export function HealthIndicator() {
  const [open, setOpen] = useState(false)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const next = await getHealth()
        if (cancelled) return
        setHealth(next)
        setOk(isHealthy(next.status))
      } catch {
        if (cancelled) return
        setHealth(null)
        setOk(false)
      }
    }
    void load()
    const timer = window.setInterval(() => void load(), 30_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Health"
        onClick={() => setOpen(true)}
      >
        <span className="relative flex size-2">
          <span
            className={cn(
              "absolute inline-flex size-full animate-ping rounded-full opacity-75",
              ok ? "bg-emerald-500" : "bg-red-500",
            )}
          />
          <span
            className={cn(
              "relative inline-flex size-2 rounded-full",
              ok ? "bg-emerald-500" : "bg-red-500",
            )}
          />
        </span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Health</DialogTitle>
            <DialogDescription>
              {health ? health.status : "Health check unavailable"}
            </DialogDescription>
          </DialogHeader>
          {health ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <Card size="sm">
                  <CardHeader>
                    <CardTitle>Database</CardTitle>
                  </CardHeader>
                  <CardContent className="font-mono text-xs break-all">
                    {preview(health.database)}
                  </CardContent>
                </Card>
                <Card size="sm">
                  <CardHeader>
                    <CardTitle>Scheduler</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-xs">
                    <p>Running: {health.scheduler.is_running ? "Yes" : "No"}</p>
                    <p>Jobs: {health.scheduler.jobs_count}</p>
                  </CardContent>
                </Card>
                <Card size="sm">
                  <CardHeader>
                    <CardTitle>Rate limiter</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-xs">
                    <p>Rate: {health.rate_limiter.rate_per_second}/s</p>
                    <p>Capacity: {health.rate_limiter.capacity}</p>
                    <p>Tokens: {health.rate_limiter.current_tokens}</p>
                  </CardContent>
                </Card>
              </div>
              <JsonViewer value={health} />
            </div>
          ) : (
            <p className="text-xs text-destructive">Unable to reach /health.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
