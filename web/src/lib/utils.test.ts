import { describe, expect, it } from "vitest"
import { formatRelativeTime } from "@/lib/utils"

describe("formatRelativeTime", () => {
  const now = new Date("2026-09-26T00:00:00Z")

  it("formats past and future instants", () => {
    expect(formatRelativeTime("2026-09-25T22:00:00Z", now)).toBe("2 hours ago")
    expect(formatRelativeTime("2026-09-29T00:00:00Z", now)).toBe("in 3 days")
    expect(formatRelativeTime(now, now)).toBe("now")
  })

  it("returns a dash for empty values", () => {
    expect(formatRelativeTime(null, now)).toBe("—")
    expect(formatRelativeTime("not-a-date", now)).toBe("—")
  })
})
