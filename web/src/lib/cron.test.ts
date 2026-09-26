import cronstrue from "cronstrue"
import { describe, expect, it } from "vitest"
import { CRON_PRESETS, explainCronDual, isValidCron } from "@/lib/cron"

const options = { throwExceptionOnParseError: true, use24HourTimeFormat: true } as const

function expectedLocal(expr: string): string {
  const [minute = "", hour = "", dayOfMonth = "*", month = "*", dayOfWeek = "*"] = expr
    .trim()
    .split(/\s+/)
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
  const local = Date.UTC(instant.getFullYear(), instant.getMonth(), instant.getDate())
  const utc = Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth(), instant.getUTCDate())
  const days = Math.round((local - utc) / 86_400_000)
  const suffix = days > 0 ? " (+1 day)" : days < 0 ? " (-1 day)" : ""
  const shifted = [
    String(instant.getMinutes()),
    String(instant.getHours()),
    dayOfMonth,
    month,
    dayOfWeek,
  ].join(" ")
  return `${cronstrue.toString(shifted, options)}${suffix}`
}

describe("isValidCron", () => {
  it("accepts the presets and other five-field expressions", () => {
    for (const preset of CRON_PRESETS) {
      expect(isValidCron(preset.expression)).toBe(true)
    }
    expect(isValidCron("* * * * *")).toBe(true)
    expect(isValidCron("  0 0 * * *  ")).toBe(true)
  })

  it("rejects the wrong field count and expressions cronstrue cannot parse", () => {
    expect(isValidCron("")).toBe(false)
    expect(isValidCron("* * * *")).toBe(false)
    expect(isValidCron("* * * * * *")).toBe(false)
    expect(isValidCron("60 * * * *")).toBe(false)
    expect(isValidCron("nope nope nope nope nope")).toBe(false)
  })
})

describe("explainCronDual", () => {
  it("appends UTC and shifts numeric hours into local time", () => {
    const expr = "0 8 * * *"
    const explained = explainCronDual(expr)
    expect(explained.utc).toBe(`${cronstrue.toString(expr, options)} (UTC)`)
    expect(explained.local).toBe(expectedLocal(expr))
  })

  it("notes a day change when local midnight crosses a calendar day", () => {
    const expr = "30 0 * * 0"
    const explained = explainCronDual(expr)
    expect(explained.local).toBe(expectedLocal(expr))
    expect(explained.utc.endsWith(" (UTC)")).toBe(true)
  })

  it("treats star and step hours as the same in every timezone", () => {
    for (const expr of ["*/15 * * * *", "0 * * * *", "0 */6 * * *"]) {
      expect(explainCronDual(expr).local).toBe("Interval schedule (same in all timezones)")
      expect(explainCronDual(expr).utc.endsWith(" (UTC)")).toBe(true)
    }
  })
})
