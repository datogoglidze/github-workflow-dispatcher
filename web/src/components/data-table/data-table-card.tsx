import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function DataTableCard({
  title,
  activeFilters,
  onClear,
  children,
}: {
  title?: string
  activeFilters: number
  onClear: () => void
  children: ReactNode
}) {
  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <div className="flex items-center gap-4">
          {title && <CardTitle>{title}</CardTitle>}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex h-8 items-center gap-2 px-2 shadow-sm"
            onClick={onClear}
            disabled={activeFilters === 0}
          >
            <span className="text-xs font-medium">Clear filters</span>
            <Badge variant="secondary">{activeFilters}</Badge>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  )
}
