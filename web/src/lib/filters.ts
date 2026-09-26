export type FilterOp = "eq" | "ne" | "ilike" | "in" | "lt" | "gt" | "between"

export type FilterColumn = {
  key: string
  type: "text" | "boolean" | "date"
  op?: FilterOp
}

export function filtersToParams(
  columns: readonly FilterColumn[],
  values: Record<string, string>,
): Record<string, string> {
  const params: Record<string, string> = {}
  for (const column of columns) {
    const raw = values[column.key]?.trim() ?? ""
    if (raw === "" || raw === "all") continue
    
    let defaultOp: FilterOp = "eq"
    if (column.type === "text") defaultOp = "ilike"
    
    const op = (values[`${column.key}_op`] as FilterOp) || column.op || defaultOp
    params[`${column.key}[${op}]`] = op === "ilike" ? `%${raw}%` : raw
  }
  return params
}

export function readFiltersFromParams(
  columns: readonly FilterColumn[],
  searchParams: URLSearchParams
): Record<string, string> {
  const values: Record<string, string> = {}
  for (const column of columns) {
    const possibleOps = ["eq", "ne", "ilike", "lt", "gt", "between"]
    for (const op of possibleOps) {
      const val = searchParams.get(`${column.key}[${op}]`)
      if (val != null) {
        values[column.key] = op === "ilike" ? val.replace(/^%|%$/g, "") : val
        values[`${column.key}_op`] = op
        break
      }
    }
  }
  return values
}
