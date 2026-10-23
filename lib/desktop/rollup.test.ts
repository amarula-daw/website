import assert from "node:assert/strict"
import { describe, it as test } from "node:test"

import { dayOf, mergeEvents } from "@/convex/analyticsRollup"

describe("analytics rollup", () => {
  test("merges events by name and labels, summing values and keeping maxima", () => {
    const first = mergeEvents(
      [],
      [
        {
          name: "command.used",
          props: {
            command: "playlist.addTrack",
            caller: "ui",
            ok: 2,
            failed: 0,
          },
        },
        { name: "usage.summary", props: { minutes: 10, cpuMax: 0.5 } },
      ]
    )
    const merged = mergeEvents(first, [
      {
        name: "command.used",
        props: { caller: "ui", command: "playlist.addTrack", ok: 1, failed: 1 },
      },
      {
        name: "command.used",
        props: { command: "playlist.addTrack", caller: "agent", ok: 1 },
      },
      { name: "usage.summary", props: { minutes: 5, cpuMax: 0.3 } },
    ])
    assert.deepEqual(merged, [
      {
        name: "command.used",
        labels: { command: "playlist.addTrack", caller: "ui" },
        count: 2,
        values: { ok: 3, failed: 1 },
      },
      {
        name: "usage.summary",
        labels: {},
        count: 2,
        values: { minutes: 15, cpuMax: 0.5 },
      },
      {
        name: "command.used",
        labels: { command: "playlist.addTrack", caller: "agent" },
        count: 1,
        values: { ok: 1 },
      },
    ])
    // The entries passed in aren't changed.
    assert.equal(first[0].count, 1)
  })

  test("days start at UTC midnight", () => {
    assert.equal(
      dayOf(Date.parse("2026-10-19T23:59:59Z")),
      Date.parse("2026-10-19T00:00:00Z")
    )
  })
})
