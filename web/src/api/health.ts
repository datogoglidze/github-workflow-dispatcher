import { apiFetch } from "@/api/client"
import type { HealthStatus } from "@/api/types"

export function getHealth() {
  return apiFetch<HealthStatus>("/health")
}
