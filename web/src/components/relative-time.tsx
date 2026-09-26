import { formatDate, formatRelativeTime, formatUtcDate } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function RelativeTime({ value }: { value: string | null | undefined }) {
  if (!value) return <span>—</span>
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-default underline decoration-dotted underline-offset-2">
          {formatRelativeTime(value)}
        </span>
      </TooltipTrigger>
      <TooltipContent className="flex-col items-start">
        <span>{formatDate(value)}</span>
        <span>{formatUtcDate(value)} UTC</span>
      </TooltipContent>
    </Tooltip>
  )
}
