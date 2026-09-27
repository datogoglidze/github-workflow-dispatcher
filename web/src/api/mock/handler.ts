import type {
  DispatchLog,
  DispatchLogList,
  Repository,
  RepositoryList,
  Schedule,
  ScheduleList,
  SyncResult,
  Workflow,
  WorkflowList,
} from "@/api/types"
import {
  initialHealth,
  initialLogs,
  initialRepositories,
  initialSchedules,
  initialWorkflows,
} from "@/api/mock/data"

const STORAGE_KEY = "gwd_mock_state_v2"

interface MockState {
  repositories: Repository[]
  workflows: Workflow[]
  schedules: Schedule[]
  logs: DispatchLog[]
}

function loadState(): MockState {
  if (typeof window === "undefined" || !window.localStorage) {
    return {
      repositories: [...initialRepositories],
      workflows: [...initialWorkflows],
      schedules: [...initialSchedules],
      logs: [...initialLogs],
    }
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as MockState
      if (
        Array.isArray(parsed.repositories) &&
        Array.isArray(parsed.workflows) &&
        Array.isArray(parsed.schedules) &&
        Array.isArray(parsed.logs)
      ) {
        return parsed
      }
    }
  } catch {
    // fallback
  }

  const fresh: MockState = {
    repositories: [...initialRepositories],
    workflows: [...initialWorkflows],
    schedules: [...initialSchedules],
    logs: [...initialLogs],
  }
  saveState(fresh)
  return fresh
}

function saveState(state: MockState) {
  if (typeof window === "undefined" || !window.localStorage) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

let state: MockState = loadState()

function getNestedValue(obj: unknown, path: string): unknown {
  if (obj == null) return undefined
  let curr: any = obj
  const parts = path.split(".")
  for (const part of parts) {
    if (curr == null) break
    curr = curr[part]
  }

  if (curr === undefined && typeof obj === "object" && obj !== null && "target" in obj) {
    // Fallback for logs which reference target fields directly like workflow_name
    const target = (obj as { target?: Record<string, unknown> }).target
    if (target && path in target) {
      return target[path]
    }
  }

  return curr
}

function applyFiltersAndSort<T>(
  items: T[],
  params: URLSearchParams,
  defaultSortField?: string,
): { items: T[]; total: number; limit: number; offset: number; count: number } {
  let filtered = [...items]

  for (const [paramKey, paramValue] of params.entries()) {
    if (paramKey === "limit" || paramKey === "offset" || paramKey === "sort") continue
    if (paramValue == null || paramValue === "") continue

    const match = paramKey.match(/^(.+?)\[(\w+)\]$/)
    const field = match ? match[1] : paramKey
    const op = match ? match[2] : "eq"

    filtered = filtered.filter((item) => {
      const val = getNestedValue(item, field)
      if (val === undefined) return true

      if (op === "ilike" || op === "like") {
        const clean = paramValue.replace(/^%|%$/g, "").toLowerCase()
        return String(val).toLowerCase().includes(clean)
      }
      if (op === "eq") {
        if (typeof val === "boolean") {
          return val === (paramValue === "true")
        }
        if (typeof val === "number") {
          return val === Number(paramValue)
        }
        return String(val) === paramValue
      }
      if (op === "ne") {
        if (typeof val === "boolean") {
          return val !== (paramValue === "true")
        }
        return String(val) !== paramValue
      }
      return true
    })
  }

  const sort = params.get("sort") || defaultSortField
  if (sort) {
    const isDesc = sort.startsWith("-")
    const sortField = isDesc ? sort.slice(1) : sort
    filtered.sort((a, b) => {
      const aVal = getNestedValue(a, sortField)
      const bVal = getNestedValue(b, sortField)
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (aVal < bVal) return isDesc ? 1 : -1
      if (aVal > bVal) return isDesc ? -1 : 1
      return 0
    })
  }

  const total = filtered.length
  const limitParam = params.get("limit")
  const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : 25
  const offsetParam = params.get("offset")
  const offset = offsetParam ? Math.max(0, parseInt(offsetParam, 10)) : 0
  const sliced = filtered.slice(offset, offset + limit)

  return {
    items: sliced,
    total,
    limit,
    offset,
    count: sliced.length,
  }
}

export async function handleMockRequest<T>(path: string, init?: RequestInit): Promise<T> {
  // Add small latency (100ms) for realistic UX
  await new Promise((resolve) => setTimeout(resolve, 100))

  const url = new URL(path, "http://localhost")
  const pathname = url.pathname
  const params = url.searchParams
  const method = (init?.method || "GET").toUpperCase()

  // 1. Health
  if (pathname === "/health" && method === "GET") {
    return initialHealth as T
  }

  // 2. Repositories
  if (pathname === "/repositories" && method === "GET") {
    const result = applyFiltersAndSort(state.repositories, params, "full_name")
    const response: RepositoryList = {
      repositories: result.items,
      count: result.count,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    }
    return response as T
  }

  if (pathname === "/repositories/sync" && method === "POST") {
    const now = new Date().toISOString()
    state.repositories = state.repositories.map((repo) => ({
      ...repo,
      last_synced_at: now,
    }))
    saveState(state)
    const result: SyncResult = {
      repositories_synced: state.repositories.length,
      workflows_synced: state.workflows.length,
      workflows_marked_deleted: 0,
    }
    return result as T
  }

  // 3. Workflows
  if (pathname === "/workflows" && method === "GET") {
    const result = applyFiltersAndSort(state.workflows, params, "name")
    const response: WorkflowList = {
      workflows: result.items,
      count: result.count,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    }
    return response as T
  }

  const triggerWfMatch = pathname.match(/^\/workflows\/([^/]+)\/trigger$/)
  if (triggerWfMatch && method === "POST") {
    const workflowId = decodeURIComponent(triggerWfMatch[1])
    const wf = state.workflows.find((w) => w.id === workflowId)
    if (!wf) throw new Error(`Workflow not found: ${workflowId}`)

    let bodyData: { ref?: string; inputs?: Record<string, unknown> } = {}
    if (init?.body) {
      try {
        bodyData = JSON.parse(String(init.body))
      } catch {
        // ignore
      }
    }

    const runNumber = Math.floor(1000000000 + Math.random() * 9000000000)
    const log: DispatchLog = {
      id: `log-${Date.now()}`,
      schedule_id: null,
      schedule: null,
      target: {
        repository_full_name: wf.repository.full_name,
        repository_url: wf.repository.url,
        workflow_name: wf.name,
        workflow_path: wf.path,
        workflow_url: wf.url,
        github_workflow_id: wf.github_workflow_id,
        cron_expression: null,
        ref: bodyData.ref || wf.repository.default_branch,
        resolved_ref: wf.sha,
        inputs: bodyData.inputs || null,
      },
      triggered_at: new Date().toISOString(),
      status_code: 204,
      run_url: `https://github.com/${wf.repository.full_name}/actions/runs/${runNumber}`,
      response_payload: { status: "dispatched", mock: true },
      error_message: null,
    }

    state.logs = [log, ...state.logs]
    saveState(state)
    return { log } as T
  }

  // 4. Schedules
  if (pathname === "/schedules" && method === "GET") {
    const result = applyFiltersAndSort(state.schedules, params, "next_run_at")
    const response: ScheduleList = {
      schedules: result.items,
      count: result.count,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    }
    return response as T
  }

  if (pathname === "/schedules" && method === "POST") {
    let bodyData: any = {}
    if (init?.body) {
      bodyData = JSON.parse(String(init.body))
    }
    const wf = state.workflows.find((w) => w.id === bodyData.workflow_id)
    if (!wf) throw new Error(`Workflow not found: ${bodyData.workflow_id}`)

    const schedule: Schedule = {
      id: `sched-${Date.now()}`,
      workflow_id: wf.id,
      workflow: wf,
      cron_expression: bodyData.cron_expression,
      ref: bodyData.ref ?? null,
      inputs: bodyData.inputs ?? null,
      is_enabled: bodyData.is_enabled ?? true,
      last_run_at: null,
      next_run_at: new Date(Date.now() + 86400000).toISOString(),
    }

    state.schedules = [schedule, ...state.schedules]
    saveState(state)
    return { schedule } as T
  }

  const patchScheduleMatch = pathname.match(/^\/schedules\/([^/]+)$/)
  if (patchScheduleMatch && method === "PATCH") {
    const scheduleId = decodeURIComponent(patchScheduleMatch[1])
    const idx = state.schedules.findIndex((s) => s.id === scheduleId)
    if (idx === -1) throw new Error(`Schedule not found: ${scheduleId}`)

    let bodyData: any = {}
    if (init?.body) {
      bodyData = JSON.parse(String(init.body))
    }

    const current = state.schedules[idx]
    const updated: Schedule = {
      ...current,
      ...(bodyData.cron_expression !== undefined
        ? { cron_expression: bodyData.cron_expression }
        : {}),
      ...(bodyData.ref !== undefined ? { ref: bodyData.ref } : {}),
      ...(bodyData.inputs !== undefined ? { inputs: bodyData.inputs } : {}),
      ...(bodyData.is_enabled !== undefined ? { is_enabled: bodyData.is_enabled } : {}),
    }

    state.schedules[idx] = updated
    saveState(state)
    return { schedule: updated } as T
  }

  if (patchScheduleMatch && method === "DELETE") {
    const scheduleId = decodeURIComponent(patchScheduleMatch[1])
    state.schedules = state.schedules.filter((s) => s.id !== scheduleId)
    saveState(state)
    return { status: "success" } as T
  }

  const triggerScheduleMatch = pathname.match(/^\/schedules\/([^/]+)\/trigger$/)
  if (triggerScheduleMatch && method === "POST") {
    const scheduleId = decodeURIComponent(triggerScheduleMatch[1])
    const sched = state.schedules.find((s) => s.id === scheduleId)
    if (!sched) throw new Error(`Schedule not found: ${scheduleId}`)

    const now = new Date().toISOString()
    sched.last_run_at = now

    const runNumber = Math.floor(1000000000 + Math.random() * 9000000000)
    const log: DispatchLog = {
      id: `log-${Date.now()}`,
      schedule_id: sched.id,
      schedule: sched,
      target: {
        repository_full_name: sched.workflow.repository.full_name,
        repository_url: sched.workflow.repository.url,
        workflow_name: sched.workflow.name,
        workflow_path: sched.workflow.path,
        workflow_url: sched.workflow.url,
        github_workflow_id: sched.workflow.github_workflow_id,
        cron_expression: sched.cron_expression,
        ref: sched.ref || sched.workflow.repository.default_branch,
        resolved_ref: sched.workflow.sha,
        inputs: sched.inputs || null,
      },
      triggered_at: now,
      status_code: 204,
      run_url: `https://github.com/${sched.workflow.repository.full_name}/actions/runs/${runNumber}`,
      response_payload: { status: "dispatched", mock: true },
      error_message: null,
    }

    state.logs = [log, ...state.logs]
    saveState(state)
    return { log } as T
  }

  // 5. Logs
  if (pathname === "/logs" && method === "GET") {
    const result = applyFiltersAndSort(state.logs, params, "-triggered_at")
    const response: DispatchLogList = {
      logs: result.items,
      count: result.count,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    }
    return response as T
  }

  throw new Error(`Unhandled mock route: ${method} ${pathname}`)
}
