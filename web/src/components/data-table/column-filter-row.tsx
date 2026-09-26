import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TableHead, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

export type ColumnFilterDef = {
  id: string
  filter?: "text" | "boolean" | "date"
  filterKey?: string
}

const OPERATOR_SYMBOLS: Record<string, string> = {
  ilike: "≈",
  eq: "=",
  ne: "≠",
  gt: ">",
  ge: "≥",
  lt: "<",
  le: "≤",
  between: "↔",
}

const textOps = [
  { value: "ilike", label: "Contains" },
  { value: "eq", label: "Equals" },
  { value: "ne", label: "Does not equal" },
]

const booleanOps = [
  { value: "eq", label: "Equals" },
  { value: "ne", label: "Does not equal" },
]

const dateOps = [
  { value: "eq", label: "Equals" },
  { value: "lt", label: "Before" },
  { value: "gt", label: "After" },
  { value: "between", label: "Between" },
]

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
    <TableRow className="border-b border-border/60 bg-muted/20 hover:bg-muted/25">
      {columns.map((column) => {
        const key = column.filterKey ?? column.id
        const opKey = `${key}_op`
        const setOp = (op: string) => onChange(opKey, op)

        const val = values[key] ?? ""
        const isActive = column.filter === "boolean" ? val !== "" && val !== "all" : val !== "" && val !== ","

        const renderOpMenu = (ops: { value: string; label: string }[], currentOp: string) => {
          const symbol = OPERATOR_SYMBOLS[currentOp] ?? currentOp
          return (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "flex h-7 w-6 shrink-0 items-center justify-center rounded-md border text-[11px] font-mono font-medium transition-colors cursor-pointer outline-none ring-offset-background focus-visible:ring-1 focus-visible:ring-ring",
                  isActive
                    ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20"
                    : "border-input bg-background/80 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                aria-label="Filter operator"
              >
                {symbol}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 p-1 text-xs">
                <div className="space-y-0.5">
                  {ops.map((op) => (
                    <DropdownMenuItem
                      key={op.value}
                      onClick={() => setOp(op.value)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-xs cursor-pointer",
                        currentOp === op.value && "font-medium text-primary"
                      )}
                    >
                      <span>{op.label}</span>
                      <span className="font-mono text-muted-foreground">
                        {OPERATOR_SYMBOLS[op.value]}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }

        return (
          <TableHead key={column.id} className="py-1.5 align-middle h-auto px-2">
            {column.filter === "text" ? (
              <div className="flex min-w-0 flex-1 items-center gap-1">
                {renderOpMenu(textOps, values[opKey] || "ilike")}
                <Input
                  value={val}
                  onChange={(event) => onChange(key, event.target.value)}
                  className="h-7 text-xs min-w-0 flex-1 bg-background/90"
                  aria-label={`Filter ${key}`}
                  placeholder="Filter..."
                />
              </div>
            ) : null}
            {column.filter === "boolean" ? (
              <div className="flex min-w-0 flex-1 items-center gap-1">
                {renderOpMenu(booleanOps, values[opKey] || "eq")}
                <Select
                  value={val || "all"}
                  onValueChange={(value) => onChange(key, value === "all" ? "" : value)}
                >
                  <SelectTrigger size="sm" className="h-7 min-w-0 flex-1 text-xs bg-background/90" aria-label={`Filter ${key}`}>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">True / Enabled</SelectItem>
                    <SelectItem value="false">False / Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {column.filter === "date" ? (
              <div className="flex min-w-0 flex-1 items-center gap-1">
                {renderOpMenu(dateOps, values[opKey] || "eq")}
                {(values[opKey] || "eq") === "between" ? (
                  <div className="flex min-w-0 flex-1 items-center gap-1">
                    <Input
                      type="date"
                      value={val.split(",")[0] || ""}
                      onChange={(e) => {
                        const p2 = val.split(",")[1] || ""
                        const newVal = `${e.target.value},${p2}`
                        onChange(key, newVal === "," ? "" : newVal)
                      }}
                      className="h-7 text-[11px] w-1/2 px-1.5 font-mono bg-background/90"
                    />
                    <Input
                      type="date"
                      value={val.split(",")[1] || ""}
                      onChange={(e) => {
                        const p1 = val.split(",")[0] || ""
                        const newVal = `${p1},${e.target.value}`
                        onChange(key, newVal === "," ? "" : newVal)
                      }}
                      className="h-7 text-[11px] w-1/2 px-1.5 font-mono bg-background/90"
                    />
                  </div>
                ) : (
                  <Input
                    type="date"
                    value={val}
                    onChange={(event) => onChange(key, event.target.value)}
                    className="h-7 text-[11px] min-w-0 flex-1 font-mono bg-background/90"
                    aria-label={`Filter ${key}`}
                  />
                )}
              </div>
            ) : null}
          </TableHead>
        )
      })}
    </TableRow>
  )
}
