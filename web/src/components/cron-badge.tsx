import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { explainCronDual, isValidCron } from "@/lib/cron"

export function CronBadge({ expression }: { expression: string | null }) {
  if (!expression) {
    return (
      <Badge variant="outline" className="border-dashed font-normal">
        Manual run
      </Badge>
    )
  }

  const explanation = isValidCron(expression) ? explainCronDual(expression) : null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="font-mono">
          {expression}
        </Badge>
      </TooltipTrigger>
      {explanation ? (
        <TooltipContent className="flex-col items-start">
          <span>{explanation.utc}</span>
          <span>{explanation.local}</span>
        </TooltipContent>
      ) : null}
    </Tooltip>
  )
}
