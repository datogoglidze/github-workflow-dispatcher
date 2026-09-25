import { apiFetch, buildQueryString, type QueryParams } from "@/api/client"
import type { RepositoryList, SyncResult } from "@/api/types"

export function listRepositories(params: QueryParams) {
  return apiFetch<RepositoryList>(`/repositories${buildQueryString(params)}`)
}

export function syncRepositories() {
  return apiFetch<SyncResult>("/repositories/sync", { method: "POST" })
}
