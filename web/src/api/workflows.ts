import { apiFetch, buildQueryString, type QueryParams } from "@/api/client"
import type { DispatchLog, WorkflowList } from "@/api/types"

export interface TriggerWorkflowBody {
  ref?: string
  inputs?: Record<string, unknown>
}

export function listWorkflows(params: QueryParams) {
  return apiFetch<WorkflowList>(`/workflows${buildQueryString(params)}`)
}

export async function triggerWorkflow(id: string, body: TriggerWorkflowBody) {
  const data = await apiFetch<{ log: DispatchLog }>(
    `/workflows/${encodeURIComponent(id)}/trigger`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  )
  return data.log
}
