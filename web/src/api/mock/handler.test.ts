import { describe, expect, it } from "vitest"
import { handleMockRequest } from "@/api/mock/handler"
import type {
  DispatchLog,
  HealthStatus,
  RepositoryList,
  Schedule,
  ScheduleList,
  SyncResult,
  WorkflowList,
} from "@/api/types"

describe("handleMockRequest", () => {
  it("returns mock health status", async () => {
    const health = await handleMockRequest<HealthStatus>("/health")
    expect(health.status).toBe("healthy")
    expect(health.scheduler.is_running).toBe(true)
  })

  it("lists and filters repositories", async () => {
    const repos = await handleMockRequest<RepositoryList>("/repositories?limit=10")
    expect(repos.repositories.length).toBeGreaterThan(0)
    expect(repos.total).toBe(repos.repositories.length)

    const filtered = await handleMockRequest<RepositoryList>(
      "/repositories?full_name[ilike]=payment",
    )
    expect(filtered.repositories.length).toBe(1)
    expect(filtered.repositories[0].name).toBe("payment-gateway")
  })

  it("syncs repositories", async () => {
    const sync = await handleMockRequest<SyncResult>("/repositories/sync", { method: "POST" })
    expect(sync.repositories_synced).toBeGreaterThan(0)
    expect(sync.workflows_synced).toBeGreaterThan(0)
  })

  it("lists workflows and triggers one", async () => {
    const list = await handleMockRequest<WorkflowList>("/workflows?limit=10")
    expect(list.workflows.length).toBeGreaterThan(0)

    const wf = list.workflows[0]
    const triggered = await handleMockRequest<{ log: DispatchLog }>(
      `/workflows/${encodeURIComponent(wf.id)}/trigger`,
      {
        method: "POST",
        body: JSON.stringify({ ref: "main", inputs: { test: "123" } }),
      },
    )
    expect(triggered.log.target?.workflow_name).toBe(wf.name)
    expect(triggered.log.status_code).toBe(204)
  })

  it("creates, updates, triggers, and deletes a schedule", async () => {
    const schedulesBefore = await handleMockRequest<ScheduleList>("/schedules?limit=50")
    const initialCount = schedulesBefore.total

    const created = await handleMockRequest<{ schedule: Schedule }>("/schedules", {
      method: "POST",
      body: JSON.stringify({
        workflow_id: "wf-1",
        cron_expression: "0 12 * * *",
        is_enabled: true,
      }),
    })
    expect(created.schedule.cron_expression).toBe("0 12 * * *")

    const updated = await handleMockRequest<{ schedule: Schedule }>(
      `/schedules/${encodeURIComponent(created.schedule.id)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ is_enabled: false }),
      },
    )
    expect(updated.schedule.is_enabled).toBe(false)

    const triggered = await handleMockRequest<{ log: DispatchLog }>(
      `/schedules/${encodeURIComponent(created.schedule.id)}/trigger`,
      { method: "POST" },
    )
    expect(triggered.log.schedule_id).toBe(created.schedule.id)

    await handleMockRequest(`/schedules/${encodeURIComponent(created.schedule.id)}`, {
      method: "DELETE",
    })
    const schedulesAfter = await handleMockRequest<ScheduleList>("/schedules?limit=50")
    expect(schedulesAfter.total).toBe(initialCount)
  })
})
