import assert from "node:assert/strict"
import { describe, it as test } from "node:test"

import { costMicros } from "./pricing"

describe("Awma pricing", () => {
  test("charges Sonnet's input, cache and output rates", () => {
    // $2/M input, $10/M output, $0.20/M cache reads, 1.25x and 2x cache writes.
    assert.equal(
      costMicros("claude-sonnet-5-5", {
        input_tokens: 1000,
        output_tokens: 500,
        cache_read_input_tokens: 10_000,
        cache_creation: {
          ephemeral_5m_input_tokens: 2000,
          ephemeral_1h_input_tokens: 1000,
        },
      }),
      2000 + 5000 + 2000 + 5000 + 4000
    )
  })

  test("Haiku's long prompts cost five times as much", () => {
    assert.equal(
      costMicros("claude-haiku-5-5", {
        input_tokens: 1000,
        output_tokens: 100,
      }),
      150
    )
    assert.equal(
      costMicros("claude-haiku-5-5", { input_tokens: 200_000 }),
      100_000
    )
  })

  test("unknown models cost nothing (the proxy refuses them)", () => {
    assert.equal(costMicros("claude-opus-5-5", { input_tokens: 1000 }), 0)
  })
})
