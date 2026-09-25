import { useState } from "react"

const STORAGE_KEY = "table-page-size"
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const

function readPageSize(): number {
  const stored = Number(window.localStorage.getItem(STORAGE_KEY))
  return PAGE_SIZE_OPTIONS.some((size) => size === stored) ? stored : 20
}

export function usePagination() {
  const [pageSize, setPageSizeState] = useState(readPageSize)
  const [page, setPage] = useState(0)

  const setPageSize = (size: number) => {
    window.localStorage.setItem(STORAGE_KEY, String(size))
    setPageSizeState(size)
    setPage(0)
  }

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    limit: pageSize,
    offset: page * pageSize,
  }
}
