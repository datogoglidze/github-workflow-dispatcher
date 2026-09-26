export interface Repository {
  id: string
  github_repository_id: number
  name: string
  full_name: string
  default_branch: string
  is_active: boolean
  last_synced_at: string | null
  url: string
}

export interface RepositoryList {
  repositories: Repository[]
  count: number
  total: number
  limit: number
  offset: number
}

export interface SyncResult {
  repositories_synced: number
  workflows_synced: number
  workflows_marked_deleted: number
}

export interface Workflow {
  id: string
  repository: Repository
  github_workflow_id: number
  name: string
  path: string
  state: string
  is_dispatchable: boolean
  sha: string
  url: string
}

export interface WorkflowList {
  workflows: Workflow[]
  count: number
  total: number
  limit: number
  offset: number
}

export interface Schedule {
  id: string
  workflow_id: string
  workflow: Workflow
  cron_expression: string
  ref: string | null
  inputs: Record<string, unknown> | null
  is_enabled: boolean
  last_run_at: string | null
  next_run_at: string | null
}

export interface ScheduleList {
  schedules: Schedule[]
  count: number
  total: number
  limit: number
  offset: number
}

export interface DispatchTarget {
  repository_full_name: string
  repository_url: string | null
  workflow_name: string
  workflow_path: string
  workflow_url: string | null
  github_workflow_id?: number
  cron_expression: string | null
  ref: string | null
  resolved_ref: string | null
  inputs: Record<string, unknown> | null
}

export interface DispatchLog {
  id: string
  schedule_id: string | null
  schedule: Schedule | null
  target: DispatchTarget | null
  triggered_at: string
  status_code: number | null
  run_url: string | null
  response_payload: unknown
  error_message: string | null
}

export interface DispatchLogList {
  logs: DispatchLog[]
  count: number
  total: number
  limit: number
  offset: number
}

export interface HealthScheduler {
  is_running: boolean
  jobs_count: number
  jobs: unknown[]
}

export interface HealthRateLimiter {
  rate_per_second: number
  capacity: number
  current_tokens: number
}

export interface HealthStatus {
  status: string
  database: unknown
  scheduler: HealthScheduler
  rate_limiter: HealthRateLimiter
}
