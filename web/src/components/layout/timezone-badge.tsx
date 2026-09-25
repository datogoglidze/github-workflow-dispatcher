import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatDate, formatUtcDate, getUserTimezoneInfo } from "@/lib/utils"

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}

export function TimezoneBadge() {
  const now = useNow()
  const info = getUserTimezoneInfo(now)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="sm" className="font-mono">
          {info.offsetFormatted}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 space-y-1">
        <p className="font-medium">{info.shortName}</p>
        <p className="font-mono">Local {formatDate(now)}</p>
        <p className="font-mono">UTC {formatUtcDate(now)}</p>
        <p>Cron schedules evaluate in UTC</p>
      </TooltipContent>
    </Tooltip>
  )
}
