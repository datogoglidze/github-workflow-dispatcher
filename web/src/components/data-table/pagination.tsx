import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PAGE_SIZE_OPTIONS } from "@/hooks/use-pagination"

export function Pagination({
  offset,
  count,
  total,
  pageSize,
  onPageSize,
  onPrev,
  onNext,
}: {
  offset: number
  count: number
  total: number
  pageSize: number
  onPageSize: (size: number) => void
  onPrev: () => void
  onNext: () => void
}) {
  const from = total === 0 ? 0 : offset + 1
  const to = total === 0 ? 0 : Math.min(offset + count, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
      <p>
        Showing {from} to {to} of {total}
      </p>
      <div className="flex items-center gap-2">
        <span>Rows</span>
        <Select value={String(pageSize)} onValueChange={(value) => onPageSize(Number(value))}>
          <SelectTrigger size="sm" className="text-xs" aria-label="Rows">
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
        <Button type="button" variant="outline" size="xs" onClick={onPrev} disabled={offset === 0}>
          Prev
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={onNext}
          disabled={offset + pageSize >= total}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
