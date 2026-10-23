import assert from "node:assert/strict"
import { it } from "node:test"

import { awmaMode } from "./mode"

const budget = 7_000_000

it("runs on the allowance, then packs, then pauses", () => {
  const standing = { micros: 0, creditMicros: 0 }
  assert.equal(awmaMode(standing, budget), "included")
  assert.equal(awmaMode({ ...standing, micros: 6_999_999 }, budget), "included")
  assert.equal(
    awmaMode({ micros: budget, creditMicros: 50_000 }, budget),
    "credits"
  )
  // A pack nearly used up doesn't start a request.
  assert.equal(
    awmaMode({ micros: budget, creditMicros: 49_999 }, budget),
    "paused"
  )
  assert.equal(awmaMode({ ...standing, micros: budget }, budget), "paused")
})
