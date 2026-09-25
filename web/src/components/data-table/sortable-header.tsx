import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react"
import { TableHead } from "@/components/ui/table"

export function SortableHeader({
  label,
  field,
  sort,
  onToggle,
}: {
  label: string
  field?: string
  sort: string | null
  onToggle: (field: string) => void
}) {
  if (!field) return <TableHead className="text-xs">{label}</TableHead>

  const direction = sort === field ? "asc" : sort === `-${field}` ? "desc" : "none"
  const Icon =
    direction === "asc" ? ChevronUp : direction === "desc" ? ChevronDown : ChevronsUpDown

  return (
    <TableHead className="text-xs" aria-sort={direction === "none" ? "none" : direction === "asc" ? "ascending" : "descending"}>
      <button
        type="button"
        className="inline-flex items-center gap-1"
        onClick={() => onToggle(field)}
      >
        {label}
        <Icon className={direction === "none" ? "size-3 opacity-40" : "size-3"} />
      </button>
    </TableHead>
  )
}
