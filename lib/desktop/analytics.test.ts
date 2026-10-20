import assert from "node:assert/strict"
import { describe, it as test } from "node:test"

import { parseBatch } from "./analytics"

const now = Date.parse("2026-10-19T12:00:00Z")
const batch = (events: unknown[], extra: object = {}) => ({
  installId: "0f8fad5b-d9cb-469f-a165-70867728950e",
  app: { version: "0.3.0a", platform: "mac", os: "Mac OSX 26", arch: "arm64" },
  events,
  ...extra,
})

describe("analytics batches", () => {
  test("takes known events with counts, ids and timings", () => {
    const parsed = parseBatch(
      batch([
        {
          name: "command.used",
          at: "2026-10-19T11:50:00.000Z",
          props: {
            command: "playlist.addTrack",
            caller: "agent",
            ok: 2,
            failed: 0,
          },
        },
      ]),
      now
    )
    assert.ok(!("error" in parsed))
    assert.equal(parsed.events[0]!.at, Date.parse("2026-10-19T11:50:00Z"))
    assert.equal(parsed.events[0]!.props.command, "playlist.addTrack")
  })

  test("refuses unknown events, odd props and stale times", () => {
    const at = "2026-10-19T11:50:00.000Z"
    for (const events of [
      [{ name: "project.contents", at, props: {} }],
      [{ name: "app.launched", at, props: { _id: 1 } }],
      [{ name: "app.launched", at, props: { path: "x".repeat(200) } }],
      [{ name: "app.launched", at, props: { nested: { a: 1 } } }],
      [{ name: "app.launched", at: "2025-01-01T00:00:00Z", props: {} }],
    ])
      assert.ok("error" in parseBatch(batch(events), now))
    assert.ok(
      "error" in parseBatch(batch([], { installId: "me@example.com" }), now)
    )
    assert.ok("error" in parseBatch(batch(new Array(501).fill({})), now))
  })
})
