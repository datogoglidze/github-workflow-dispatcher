import { describe, expect, it } from "vitest"
import { filtersToParams } from "@/lib/filters"

const columns = [
  { key: "full_name", type: "text" as const },
  { key: "name", type: "text" as const, op: "eq" as const },
  { key: "is_active", type: "boolean" as const },
]

describe("filtersToParams", () => {
  it("wraps text filters as ilike and maps booleans to eq", () => {
    expect(
      filtersToParams(columns, {
        full_name: "api",
        name: "ci",
        is_active: "true",
      }),
    ).toEqual({
      "full_name[ilike]": "%api%",
      "name[eq]": "ci",
      "is_active[eq]": "true",
    })
  })

  it("skips empty text and the All boolean option", () => {
    expect(
      filtersToParams(columns, {
        full_name: "  ",
        name: "",
        is_active: "all",
      }),
    ).toEqual({})
  })
})
