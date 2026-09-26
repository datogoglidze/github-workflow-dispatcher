import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { ArrowUpRight, type LucideIcon } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export interface MetricCardProps {
  title: string
  to: string
  value: number | undefined
  loading: boolean
  icon: LucideIcon
  badge?: ReactNode
  className?: string
}

export function MetricCard({
  title,
  to,
  value,
  loading,
  icon: Icon,
  badge,
  className,
}: MetricCardProps) {
  const isLoading = loading && value == null

  return (
    <Link
      to={to}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border/80 bg-card p-4 text-card-foreground shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/25 hover:bg-muted/20 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:hover:translate-y-0 dark:border-border/60 dark:hover:border-foreground/20",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/50 text-muted-foreground transition-colors duration-200 group-hover:border-border group-hover:bg-muted group-hover:text-foreground">
            <Icon className="size-3.5" />
          </div>
          <span className="truncate text-xs font-medium text-muted-foreground transition-colors duration-200 group-hover:text-foreground">
            {title}
          </span>
        </div>
        <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground/40 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <div className="text-2xl font-semibold tracking-tight tabular-nums text-foreground sm:text-3xl">
          {isLoading ? (
            <Skeleton className="h-8 w-16 rounded-md sm:h-9" />
          ) : (
            (value ?? 0).toLocaleString()
          )}
        </div>
        {badge && <div>{badge}</div>}
      </div>
    </Link>
  )
}
