export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean | null | undefined>

export type QueryParams = Record<string, QueryValue>

type ErrorBody = {
  error?: { message?: string }
  detail?: unknown
}

let rawBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

if (typeof window !== "undefined" && rawBaseUrl.startsWith("http")) {
  try {
    const url = new URL(rawBaseUrl)
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      url.hostname = window.location.hostname
      rawBaseUrl = url.toString()
    }
  } catch (e) {
    // ignore
  }
}

const API_BASE_URL = rawBaseUrl.replace(/\/$/, "")

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

function formatDetail(detail: unknown): string | undefined {
  if (typeof detail === "string" && detail.trim()) return detail
  if (!Array.isArray(detail) || detail.length === 0) return undefined
  const first: unknown = detail[0]
  if (!first || typeof first !== "object") return undefined
  const record = first as { loc?: unknown; msg?: unknown }
  if (typeof record.msg !== "string" || !record.msg) return undefined
  const loc = Array.isArray(record.loc)
    ? record.loc.map((part) => String(part)).join(".")
    : ""
  return loc ? `${loc}: ${record.msg}` : record.msg
}

function errorMessage(body: unknown, status: number): string {
  const envelope = body as ErrorBody | null
  const message = envelope?.error?.message
  if (typeof message === "string" && message.trim()) return message
  return formatDetail(envelope?.detail) ?? `API Error ${status}`
}

export function buildQueryString(params: QueryParams): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item == null || item === "") continue
        search.append(key, String(item))
      }
      continue
    }
    search.append(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ""
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (!headers.has("Accept")) headers.set("Accept", "application/json")
  if (init?.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
  const text = await response.text()
  let body: unknown
  if (text) {
    try {
      body = JSON.parse(text) as unknown
    } catch {
      body = undefined
    }
  }

  if (!response.ok) {
    throw new ApiError(errorMessage(body, response.status), response.status)
  }

  if (
    body &&
    typeof body === "object" &&
    "data" in body &&
    (body as { status?: unknown }).status === "success"
  ) {
    return (body as { data: T }).data
  }

  return body as T
}
