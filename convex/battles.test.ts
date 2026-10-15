import assert from "node:assert/strict"
import { beforeEach, describe, it as test } from "node:test"

import { convexTest } from "convex-test"

import { api, internal } from "./_generated/api"
import schema from "./schema"

const secret = "test-secret"
process.env.CONVEX_SERVER_SECRET = secret

// Bun has no import.meta.glob; these are the modules the battles use.
const modules = {
  "./_generated/api.js": () => import("./_generated/api.js"),
  "./_generated/server.js": () => import("./_generated/server.js"),
  "./battles.ts": () => import("./battles"),
  "./schema.ts": () => import("./schema"),
}

const newTest = () => convexTest(schema, modules)
let t: ReturnType<typeof newTest>

async function addKit(slug: string, sortOrder: number) {
  return t.run(async (ctx) => {
    const storageId = await ctx.storage.store(new Blob(["zip"]))
    return ctx.db.insert("products", {
      slug,
      title: slug,
      vendor: "Amarula",
      category: "Drum kits",
      description: "",
      contents: [],
      formats: ["WAV"],
      platforms: ["macOS"],
      requires: null,
      priceCents: 0,
      purchase: { kind: "free" },
      sourceUrl: null,
      published: true,
      sortOrder,
      sellerId: null,
      image: null,
      artifacts: [
        {
          platform: "any",
          install: "samples",
          storageId,
          fileName: `${slug}.zip`,
          byteLength: 3,
          sha256: "",
        },
      ],
      updatedAt: 0,
    })
  })
}

// convex-test doesn't keep uploads' Content-Type, so these go by file name.
async function upload() {
  return t.run((ctx) => ctx.storage.store(new Blob(["beat"])))
}

const as = (userId: string, code: string) => ({ secret, userId, code })
const view = async (userId: string, code: string) =>
  (await t.query(api.battles.get, as(userId, code)))!

async function battleId(code: string) {
  return t.run(
    async (ctx) =>
      (await ctx.db
        .query("battles")
        .withIndex("by_code_and_status", (q) => q.eq("code", code))
        .first())!._id
  )
}

beforeEach(() => {
  t = newTest()
})

describe("beat battles", () => {
  test("a battle runs from lobby to results", async () => {
    await addKit("kit-a", 1)
    await addKit("kit-b", 2)
    const code = await t.mutation(api.battles.create, {
      secret,
      userId: "ann",
      name: "Ann",
      minutes: 20,
      awma: false,
    })
    await assert.rejects(
      t.mutation(api.battles.start, as("ann", code)),
      /at least 2 players/
    )
    await t.mutation(api.battles.join, { ...as("bob", code), name: "Bob" })
    await assert.rejects(
      t.mutation(api.battles.start, as("bob", code)),
      /Only the host/
    )
    await t.mutation(api.battles.start, as("ann", code))

    let battle = await view("ann", code)
    assert.equal(battle.status, "kitVote")
    assert.equal(battle.kitOptions.length, 2)

    // Both vote for the same kit, which ends the vote early.
    await t.mutation(api.battles.voteKit, { ...as("ann", code), slug: "kit-b" })
    await t.mutation(api.battles.voteKit, { ...as("bob", code), slug: "kit-b" })
    battle = await view("bob", code)
    assert.equal(battle.status, "making")
    assert.equal(battle.kit?.slug, "kit-b")
    assert.ok(battle.submitBy! < battle.phaseEndsAt!)

    // Awma isn't allowed here, and the rejected upload is deleted.
    const rejected = await upload()
    assert.deepEqual(
      await t.mutation(api.battles.submit, {
        ...as("ann", code),
        storageId: rejected,
        fileName: "ann.mp3",
        usedAwma: true,
      }),
      { error: "Awma isn't allowed in this battle" }
    )
    assert.equal(
      await t.run((ctx) => ctx.db.system.get("_storage", rejected)),
      null
    )
    const notAudio = await upload()
    assert.match(
      (
        await t.mutation(api.battles.submit, {
          ...as("ann", code),
          storageId: notAudio,
          fileName: "ann.txt",
          usedAwma: false,
        })
      ).error!,
      /MP3 or WAV/
    )

    for (const userId of ["ann", "bob"])
      assert.deepEqual(
        await t.mutation(api.battles.submit, {
          ...as(userId, code),
          storageId: await upload(),
          fileName: `${userId}.mp3`,
          usedAwma: false,
        }),
        { error: null }
      )

    battle = await view("ann", code)
    assert.equal(battle.status, "listening")
    assert.equal(battle.beats.length, 2)
    assert.ok(battle.beats.every((beat) => beat.by === null && beat.url))
    const mine = battle.beats.find((beat) => beat.isYours)!
    const theirs = battle.beats.find((beat) => !beat.isYours)!
    await assert.rejects(
      t.mutation(api.battles.vote, {
        ...as("ann", code),
        submissionId: mine.id,
        score: 5,
      }),
      /your own beat/
    )
    await assert.rejects(
      t.mutation(api.battles.vote, {
        ...as("ann", code),
        submissionId: theirs.id,
        score: 6,
      }),
      /from 1 to 5/
    )
    await t.mutation(api.battles.vote, {
      ...as("ann", code),
      submissionId: theirs.id,
      score: 4,
    })
    await t.mutation(api.battles.vote, {
      ...as("bob", code),
      submissionId: mine.id,
      score: 5,
    })

    battle = await view("bob", code)
    assert.equal(battle.status, "results")
    assert.deepEqual(
      battle.beats.map((beat) => [beat.by, beat.result?.rank]),
      [
        ["Ann", 1],
        ["Bob", 2],
      ]
    )
    assert.deepEqual(
      await t.query(api.battles.leaderboard, { secret, limit: 10 }),
      [
        { name: "Ann", battles: 1, wins: 1, points: 1 },
        { name: "Bob", battles: 1, wins: 0, points: 0 },
      ]
    )
    assert.equal(
      await t.query(api.battles.current, { secret, userId: "ann" }),
      null
    )
  })

  test("deadlines move the battle on when not everyone is done", async () => {
    const code = await t.mutation(api.battles.create, {
      secret,
      userId: "ann",
      name: "Ann",
      minutes: 30,
      awma: true,
    })
    await t.mutation(api.battles.join, { ...as("bob", code), name: "Bob" })
    await t.mutation(api.battles.start, as("ann", code))
    // No free kits listed: straight to making beats, without a kit.
    assert.equal((await view("ann", code)).status, "making")
    assert.equal((await view("ann", code)).kit, null)

    await t.mutation(api.battles.submit, {
      ...as("bob", code),
      storageId: await upload(),
      fileName: "bob.wav",
      usedAwma: true,
    })
    const id = await battleId(code)
    // A stale deadline for another phase does nothing.
    await t.mutation(internal.battles.advance, {
      battleId: id,
      from: "kitVote",
    })
    assert.equal((await view("ann", code)).status, "making")
    await t.mutation(internal.battles.advance, { battleId: id, from: "making" })
    assert.equal((await view("ann", code)).status, "listening")
    await assert.rejects(
      t.mutation(api.battles.generateUploadUrl, as("ann", code)),
      /Submissions are closed/
    )
    await t.mutation(internal.battles.advance, {
      battleId: id,
      from: "listening",
    })
    const battle = await view("ann", code)
    assert.equal(battle.status, "results")
    assert.deepEqual(battle.beats[0].result, {
      average: null,
      votes: 0,
      rank: 1,
      points: 0,
    })
  })

  test("players join one battle at a time, and hosts hand over when they leave", async () => {
    const first = await t.mutation(api.battles.create, {
      secret,
      userId: "ann",
      name: "Ann",
      minutes: 20,
      awma: false,
    })
    await t.mutation(api.battles.join, { ...as("bob", first), name: "Bob" })
    assert.equal(
      await t.query(api.battles.current, { secret, userId: "bob" }),
      first
    )

    // Ann opens another battle, which takes her out of the first; Bob hosts it now.
    const second = await t.mutation(api.battles.create, {
      secret,
      userId: "ann",
      name: "Ann",
      minutes: 20,
      awma: false,
    })
    assert.notEqual(first, second)
    const left = await view("bob", first)
    assert.equal(left.isHost, true)
    assert.deepEqual(
      left.players.map((player) => player.name),
      ["Bob"]
    )

    // The last player leaving closes the lobby.
    await t.mutation(api.battles.leaveBattle, as("bob", first))
    await assert.rejects(
      t.mutation(api.battles.join, { ...as("cat", first), name: "Cat" }),
      /ended or doesn't exist/
    )
  })

  test("only lobbies can be joined, up to eight players", async () => {
    const code = await t.mutation(api.battles.create, {
      secret,
      userId: "p0",
      name: "P0",
      minutes: 20,
      awma: false,
    })
    for (let i = 1; i < 8; i++)
      await t.mutation(api.battles.join, {
        ...as(`p${i}`, code),
        name: `P${i}`,
      })
    await assert.rejects(
      t.mutation(api.battles.join, { ...as("p8", code), name: "P8" }),
      /full/
    )
    await t.mutation(api.battles.start, as("p0", code))
    await t.mutation(api.battles.leaveBattle, as("p7", code))
    await assert.rejects(
      t.mutation(api.battles.join, { ...as("p7", code), name: "P7" }),
      /already started/
    )
  })

  test("calls without the server secret are refused", async () => {
    await assert.rejects(
      t.mutation(api.battles.create, {
        secret: "wrong",
        userId: "ann",
        name: "Ann",
        minutes: 20,
        awma: false,
      }),
      /Unauthorized/
    )
  })
})
