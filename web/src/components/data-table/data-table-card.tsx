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
  title: string
  activeFilters: number
  onClear: () => void
  children: ReactNode
}) {
  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <CardTitle>{title}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{activeFilters}</Badge>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={onClear}
              disabled={activeFilters === 0}
            >
              Clear filters
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  )
}
