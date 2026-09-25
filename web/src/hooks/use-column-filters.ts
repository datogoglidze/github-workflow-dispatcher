import { useEffect, useMemo, useState } from "react"
import { filtersToParams, type FilterColumn } from "@/lib/filters"

export function useColumnFilters(
  columns: readonly FilterColumn[],
  initial: Record<string, string> = {},
) {
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [debounced, setDebounced] = useState<Record<string, string>>(initial)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(values), 300)
    return () => window.clearTimeout(timer)
  }, [values])

  const params = useMemo(
    () => filtersToParams(columns, debounced),
    [columns, debounced],
  )

  const setValue = (key: string, value: string) => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const clear = () => {
    setValues({})
    setDebounced({})
  }

  return {
    values,
    setValue,
    clear,
    params,
    activeCount: Object.keys(params).length,
  }
}
