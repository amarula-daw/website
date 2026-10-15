import assert from "node:assert/strict"
import { describe, it as test } from "node:test"

import {
  kitWinner,
  listeningMs,
  LISTEN_MIN_MS,
  makeCode,
  normalizeCode,
  pickRandom,
  rankSubmissions,
  submissionType,
  trackLabel,
} from "@/convex/battleRules"

/** A repeatable stand-in for Math.random. */
function seeded(seed = 1) {
  let state = seed
  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}

describe("invite codes", () => {
  test("are six readable characters", () => {
    const code = makeCode(seeded())
    assert.match(code, /^[A-HJKMNP-Z2-9]{6}$/)
  })

  test("are read back whatever the case, spaces or dashes", () => {
    assert.equal(normalizeCode("abc-def"), "ABCDEF")
    assert.equal(normalizeCode(" ab cd 23 "), "ABCD23")
  })

  test("with ambiguous characters or the wrong length aren't codes", () => {
    assert.equal(normalizeCode("ABCDE0"), null)
    assert.equal(normalizeCode("ABCDEFG"), null)
    assert.equal(normalizeCode(""), null)
  })
})

describe("kits", () => {
  test("picking takes distinct items, at most what's there", () => {
    const picked = pickRandom([1, 2, 3, 4, 5], seeded(), 3)
    assert.equal(new Set(picked).size, 3)
    assert.deepEqual(pickRandom([1], seeded(), 3), [1])
  })

  test("the kit with the most votes wins", () => {
    assert.equal(kitWinner(["a", "b", "c"], ["b", "c", "b"], seeded()), "b")
  })

  test("ties and no votes are settled among the leaders", () => {
    for (let seed = 1; seed < 20; seed++) {
      assert.ok(
        ["a", "b"].includes(
          kitWinner(["a", "b", "c"], ["a", "b"], seeded(seed))!
        )
      )
      assert.ok(
        ["a", "b", "c"].includes(kitWinner(["a", "b", "c"], [], seeded(seed))!)
      )
    }
    assert.equal(kitWinner([], [], seeded()), null)
  })
})

describe("listening", () => {
  test("gives every beat time, with a floor", () => {
    assert.equal(listeningMs(1), LISTEN_MIN_MS)
    assert.ok(listeningMs(8) > LISTEN_MIN_MS)
  })

  test("labels beats by letter", () => {
    assert.equal(trackLabel(0), "Track A")
    assert.equal(trackLabel(25), "Track Z")
    assert.equal(trackLabel(26), "Track AA")
  })
})

describe("results", () => {
  test("rank by average score, sharing ranks on ties, unvoted last", () => {
    const ranked = rankSubmissions(
      ["a", "b", "c", "d"],
      [
        { submission: "a", score: 3 },
        { submission: "a", score: 5 },
        { submission: "b", score: 4 },
        { submission: "c", score: 5 },
      ]
    )
    assert.deepEqual(
      ranked.map(({ id, average, votes, rank, points }) => [
        id,
        average,
        votes,
        rank,
        points,
      ]),
      [
        ["c", 5, 1, 1, 3],
        ["a", 4, 2, 2, 1],
        ["b", 4, 1, 2, 1],
        ["d", null, 0, 4, 0],
      ]
    )
  })
})

describe("submissions", () => {
  test("are MP3 or WAV, by Content-Type or else file name", () => {
    assert.equal(submissionType("audio/mpeg", "beat"), "audio/mpeg")
    assert.equal(submissionType("audio/x-wav", "beat"), "audio/wav")
    assert.equal(submissionType("text/plain", "beat.mp3"), null)
    assert.equal(submissionType(undefined, "Beat.WAV"), "audio/wav")
    assert.equal(submissionType(undefined, "beat.flac"), null)
  })
})
