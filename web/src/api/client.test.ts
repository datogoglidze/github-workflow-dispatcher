import { describe, expect, it } from "vitest"
import { buildQueryString } from "@/api/client"

describe("buildQueryString", () => {
  it("skips empty values and repeats array keys", () => {
    const query = buildQueryString({
      limit: 10,
      offset: 0,
      sort: "name",
      empty: "",
      missing: undefined,
      nothing: null,
      flag: false,
      tags: ["a", "", "b"],
    })
    const params = new URLSearchParams(query)
    expect(query.startsWith("?")).toBe(true)
    expect(params.get("limit")).toBe("10")
    expect(params.get("offset")).toBe("0")
    expect(params.get("sort")).toBe("name")
    expect(params.get("flag")).toBe("false")
    expect(params.getAll("tags")).toEqual(["a", "b"])
    expect(params.has("empty")).toBe(false)
    expect(params.has("missing")).toBe(false)
    expect(params.has("nothing")).toBe(false)
  })

  it("returns an empty string when every value is empty", () => {
    expect(buildQueryString({ q: "", ids: [] })).toBe("")
  })
})
