import { useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PAGE_SIZE_OPTIONS } from "@/hooks/use-pagination"

export function Pagination({
  page,
  onPage,
  count,
  total,
  pageSize,
  onPageSize,
}: {
  page: number
  onPage: (page: number) => void
  count: number
  total: number
  pageSize: number
  onPageSize: (size: number) => void
}) {
  const [jumpPage, setJumpPage] = useState("")
  const offset = page * pageSize
  const from = total === 0 ? 0 : offset + 1
  const to = total === 0 ? 0 : Math.min(offset + count, total)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const current = page + 1

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault()
    const pageNum = parseInt(jumpPage, 10)
    if (!isNaN(pageNum)) {
      const validPage = Math.max(1, Math.min(pageNum, totalPages))
      onPage(validPage - 1)
      setJumpPage("")
    }
  }

  function getPageNumbers() {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, "ellipsis", totalPages]
    }
    if (current >= totalPages - 3) {
      return [
        1,
        "ellipsis",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ]
    }
    return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", totalPages]
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
      <p className="text-muted-foreground">
        Showing {from} to {to} of {total} rows
      </p>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Rows</span>
        <Select value={String(pageSize)} onValueChange={(value) => onPageSize(Number(value))}>
          <SelectTrigger size="sm" className="h-7 w-[65px] text-xs" aria-label="Rows">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-2 flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => onPage(page - 1)}
            disabled={page === 0}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-3.5" />
          </Button>

          {getPageNumbers().map((p, i) => {
            if (p === "ellipsis") {
              return (
                <div
                  key={`ellipsis-${i}`}
                  className="flex size-7 items-center justify-center text-muted-foreground"
                >
                  <MoreHorizontal className="size-3.5" />
                </div>
              )
            }
            return (
              <Button
                key={p}
                type="button"
                variant={p === current ? "default" : "outline"}
                size="icon-sm"
                onClick={() => onPage((p as number) - 1)}
                className="text-xs font-normal"
              >
                {p}
              </Button>
            )
          })}

          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => onPage(page + 1)}
            disabled={page >= totalPages - 1}
            aria-label="Next page"
          >
            <ChevronRight className="size-3.5" />
          </Button>

          {totalPages > 7 && (
            <form onSubmit={handleJump} className="ml-2 flex items-center gap-1.5">
              <span className="sr-only">Go to page:</span>
              <Input
                className="h-7 w-14 text-center text-xs [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                type="number"
                min={1}
                max={totalPages}
                placeholder="Page"
                value={jumpPage}
                onChange={(e) => setJumpPage(e.target.value)}
              />
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
