import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TableHead, TableRow } from "@/components/ui/table"

export type ColumnFilterDef = {
  id: string
  filter?: "text" | "boolean"
  filterKey?: string
}

export function ColumnFilterRow({
  columns,
  values,
  onChange,
}: {
  columns: readonly ColumnFilterDef[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
}) {
  return (
    <TableRow>
      {columns.map((column) => {
        const key = column.filterKey ?? column.id
        return (
          <TableHead key={column.id} className="py-1">
            {column.filter === "text" ? (
              <Input
                value={values[key] ?? ""}
                onChange={(event) => onChange(key, event.target.value)}
                className="h-7 text-xs"
                aria-label={`Filter ${key}`}
              />
            ) : null}
            {column.filter === "boolean" ? (
              <Select
                value={values[key] || "all"}
                onValueChange={(value) => onChange(key, value)}
              >
                <SelectTrigger size="sm" className="w-full text-xs" aria-label={`Filter ${key}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">True</SelectItem>
                  <SelectItem value="false">False</SelectItem>
                </SelectContent>
              </Select>
            ) : null}
          </TableHead>
        )
      })}
    </TableRow>
  )
}
