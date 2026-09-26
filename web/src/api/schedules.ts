import { apiFetch, buildQueryString, type QueryParams } from "@/api/client"
import type { DispatchLog, Schedule, ScheduleList } from "@/api/types"

export interface ScheduleCreateBody {
  workflow_id: string
  cron_expression: string
  ref?: string | null
  inputs?: Record<string, unknown> | null
  is_enabled: boolean
}

export interface SchedulePatchBody {
  cron_expression?: string
  ref?: string | null
  inputs?: Record<string, unknown> | null
  is_enabled?: boolean
}

export function listSchedules(params: QueryParams) {
  return apiFetch<ScheduleList>(`/schedules${buildQueryString(params)}`)
}

export async function createSchedule(body: ScheduleCreateBody) {
  const data = await apiFetch<{ schedule: Schedule }>("/schedules", {
    method: "POST",
    body: JSON.stringify(body),
  })
  return data.schedule
}

export async function updateSchedule(id: string, body: SchedulePatchBody) {
  const data = await apiFetch<{ schedule: Schedule }>(
    `/schedules/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  )
  return data.schedule
}

export async function deleteSchedule(id: string) {
  await apiFetch<unknown>(`/schedules/${encodeURIComponent(id)}`, { method: "DELETE" })
}

export async function triggerSchedule(id: string) {
  const data = await apiFetch<{ log: DispatchLog }>(
    `/schedules/${encodeURIComponent(id)}/trigger`,
    { method: "POST" },
  )
  return data.log
}
