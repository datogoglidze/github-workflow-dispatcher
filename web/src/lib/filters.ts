export type FilterOp = "eq" | "ne" | "ilike" | "in" | "lt" | "gt"

export type FilterColumn = {
  key: string
  type: "text" | "boolean"
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
    if (column.type === "boolean") {
      params[`${column.key}[eq]`] = raw
      continue
    }
    const op = column.op ?? "ilike"
    params[`${column.key}[${op}]`] = op === "ilike" ? `%${raw}%` : raw
  }
  return params
}
