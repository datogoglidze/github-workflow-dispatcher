import { apiFetch, buildQueryString, type QueryParams } from "@/api/client"
import type { DispatchLogList } from "@/api/types"

export function listLogs(params: QueryParams) {
  return apiFetch<DispatchLogList>(`/logs${buildQueryString(params)}`)
}
