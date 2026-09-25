export { cn } from "cn"

const dateTimeOptions: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
}

function toDate(value: Date | string | number): Date | null {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatParts(date: Date, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    ...dateTimeOptions,
    ...(timeZone ? { timeZone } : {}),
  }).formatToParts(date)
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ""
  return `${read("month")} ${read("day")}, ${read("year")}, ${read("hour")}:${read("minute")}:${read("second")}`
}

export function formatDate(value: Date | string | number | null | undefined): string {
  if (value == null || value === "") return "—"
  const date = toDate(value)
  return date ? formatParts(date) : "—"
}

export function formatUtcDate(
  value: Date | string | number | null | undefined,
): string {
  if (value == null || value === "") return "—"
  const date = toDate(value)
  return date ? formatParts(date, "UTC") : "—"
}

const RELATIVE_UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
  { unit: "year", ms: 1000 * 60 * 60 * 24 * 365 },
  { unit: "month", ms: 1000 * 60 * 60 * 24 * 30 },
  { unit: "week", ms: 1000 * 60 * 60 * 24 * 7 },
  { unit: "day", ms: 1000 * 60 * 60 * 24 },
  { unit: "hour", ms: 1000 * 60 * 60 },
  { unit: "minute", ms: 1000 * 60 },
  { unit: "second", ms: 1000 },
]

export function formatRelativeTime(
  value: Date | string | number | null | undefined,
  now: Date = new Date(),
): string {
  if (value == null || value === "") return "—"
  const date = toDate(value)
  if (!date) return "—"
  const delta = date.getTime() - now.getTime()
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
  for (const { unit, ms } of RELATIVE_UNITS) {
    if (Math.abs(delta) >= ms || unit === "second") {
      return formatter.format(Math.round(delta / ms), unit)
    }
  }
  return formatter.format(0, "second")
}

export function getUserTimezoneInfo(date = new Date()): {
  offsetFormatted: string
  shortName: string
} {
  const offsetMinutes = -date.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? "+" : "-"
  const absolute = Math.abs(offsetMinutes)
  const hours = Math.floor(absolute / 60)
  const minutes = absolute % 60
  const offsetFormatted =
    minutes === 0
      ? `UTC${sign}${hours}`
      : `UTC${sign}${hours}:${String(minutes).padStart(2, "0")}`
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const city = timeZone.split("/").pop() ?? timeZone
  return { offsetFormatted, shortName: city.replaceAll("_", " ") }
}
