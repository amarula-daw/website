import assert from "node:assert/strict"
import { describe, it as test } from "node:test"

import { addMonths, usageWindowAt } from "./entitlement"

const at = (iso: string) => Date.parse(iso)

describe("usage windows", () => {
  test("adding months keeps the day, clamped to short months", () => {
    assert.equal(
      addMonths(at("2026-01-31T10:00:00Z"), 1),
      at("2026-02-28T10:00:00Z")
    )
    assert.equal(
      addMonths(at("2026-03-15T00:00:00Z"), 10),
      at("2027-01-15T00:00:00Z")
    )
  })

  test("each month of a subscription is its own window, annual plans too", () => {
    const start = at("2026-01-10T12:00:00Z")
    assert.deepEqual(usageWindowAt(start, at("2026-01-20T00:00:00Z")), {
      start,
      end: at("2026-02-10T12:00:00Z"),
    })
    assert.deepEqual(usageWindowAt(start, at("2026-07-10T12:00:00Z")), {
      start: at("2026-07-10T12:00:00Z"),
      end: at("2026-08-10T12:00:00Z"),
    })
  })
})
