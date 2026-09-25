import { useState } from "react"

export function useSort(initialField: string) {
  const [sort, setSort] = useState<string | null>(initialField)

  const toggle = (field: string) => {
    setSort((current) => {
      if (current === field) return `-${field}`
      if (current === `-${field}`) return null
      return field
    })
  }

  return { sort, toggle }
}
