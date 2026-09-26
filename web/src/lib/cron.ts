import cronstrue from "cronstrue"

const CRON_OPTIONS = {
  throwExceptionOnParseError: true,
  use24HourTimeFormat: true,
} as const

export const CRON_PRESETS = [
  { label: "Every 15 mins", expression: "*/15 * * * *" },
  { label: "Every hour", expression: "0 * * * *" },
  { label: "Every 6 hours", expression: "0 */6 * * *" },
  { label: "Daily 00:00 UTC", expression: "0 0 * * *" },
  { label: "Daily 08:00 UTC", expression: "0 8 * * *" },
  { label: "Weekdays 09:00 UTC", expression: "0 9 * * 1-5" },
  { label: "Sundays 00:00 UTC", expression: "0 0 * * 0" },
] as const

export interface CronExplanation {
  utc: string
  local: string
}

function fieldsOf(expr: string): string[] {
  return expr.trim().split(/\s+/)
}

function isIntervalHour(hour: string): boolean {
  return hour === "*" || /^\*\/\d+$/.test(hour)
}

function isNumberField(field: string): boolean {
  return /^\d+$/.test(field)
}

function dayShift(instant: Date): -1 | 0 | 1 {
  const local = Date.UTC(instant.getFullYear(), instant.getMonth(), instant.getDate())
  const utc = Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth(), instant.getUTCDate())
  const days = Math.round((local - utc) / 86_400_000)
  if (days > 0) return 1
  if (days < 0) return -1
  return 0
}

export function isValidCron(expr: string): boolean {
  const fields = fieldsOf(expr)
  if (fields.length !== 5 || fields.some((field) => field === "")) return false
  try {
    cronstrue.toString(expr.trim(), CRON_OPTIONS)
    return true
  } catch {
    return false
  }
}

export function explainCronDual(expr: string): CronExplanation {
  const normalized = expr.trim()
  const utcText = cronstrue.toString(normalized, CRON_OPTIONS)
  const utc = `${utcText} (UTC)`
  const [minute = "", hour = "", dayOfMonth = "*", month = "*", dayOfWeek = "*"] =
    fieldsOf(normalized)
  if (isIntervalHour(hour)) {
    return { utc, local: "Interval schedule (same in all timezones)" }
  }
  if (!isNumberField(minute) || !isNumberField(hour)) {
    return { utc, local: utcText }
  }

  const now = new Date()
  const instant = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      Number(hour),
      Number(minute),
      0,
    ),
  )
  const shifted = [
    String(instant.getMinutes()),
    String(instant.getHours()),
    dayOfMonth,
    month,
    dayOfWeek,
  ].join(" ")
  const shift = dayShift(instant)
  const suffix = shift > 0 ? " (+1 day)" : shift < 0 ? " (-1 day)" : ""
  return { utc, local: `${cronstrue.toString(shifted, CRON_OPTIONS)}${suffix}` }
}
