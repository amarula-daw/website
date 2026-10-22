import assert from "node:assert/strict"
import { it } from "node:test"

import { awmaMode, LITE_MODEL, toLite } from "./mode"

const budget = 7_000_000

it("runs on the allowance, then packs, then lite mode, then pauses", () => {
  const standing = { micros: 0, liteMicros: 0, creditMicros: 0 }
  assert.equal(awmaMode(standing, budget), "included")
  assert.equal(awmaMode({ ...standing, micros: 6_999_999 }, budget), "included")
  assert.equal(
    awmaMode({ ...standing, micros: budget, creditMicros: 50_000 }, budget),
    "credits"
  )
  // A pack nearly used up doesn't start a full request.
  assert.equal(
    awmaMode({ ...standing, micros: budget, creditMicros: 49_999 }, budget),
    "lite"
  )
  assert.equal(awmaMode({ ...standing, micros: budget }, budget), "lite")
  assert.equal(
    awmaMode({ ...standing, micros: budget, liteMicros: 1_000_000 }, budget),
    "paused"
  )
})

it("lite mode swaps the model and drops what only Sonnet takes", () => {
  assert.deepEqual(toLite({ model: "claude-sonnet-5-5", max_tokens: 10 }), {
    model: LITE_MODEL,
    max_tokens: 10,
  })
  assert.deepEqual(
    toLite({
      model: "claude-sonnet-5-5",
      thinking: { type: "between_tools" },
      output_config: { effort: "high" },
    }),
    {
      model: LITE_MODEL,
      thinking: { type: "disabled" },
      output_config: { effort: "high" },
    }
  )
  assert.deepEqual(
    toLite({ model: "claude-sonnet-5-5", thinking: { type: "adaptive" } })
      .thinking,
    { type: "adaptive" }
  )
})
