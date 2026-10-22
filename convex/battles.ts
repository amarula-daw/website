import { ConvexError, v } from "convex/values"

import { internal } from "./_generated/api"
import type { Doc, Id } from "./_generated/dataModel"
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server"
import {
  BEAT_RETENTION_MS,
  battleLengths,
  KIT_OPTIONS,
  KIT_VOTE_MS,
  kitWinner,
  listeningMs,
  LOBBY_TTL_MS,
  makeCode,
  MAX_PLAYERS,
  MAX_SCORE,
  MAX_SUBMISSION_BYTES,
  MIN_PLAYERS,
  MIN_SCORE,
  pickRandom,
  rankSubmissions,
  SUBMIT_GRACE_MS,
  submissionType,
  trackLabel,
} from "./battleRules"
import { battleStatus } from "./schema"
import { checkSecret, secretArg } from "./server"

/*
 * Beat battles, called by the website's /api/battles routes for the desktop
 * app. The routes pass the user the Clerk OAuth token belongs to (userId)
 * and check the subscription; these functions check everything about the
 * battle itself. Phases end on a schedule, or early once everyone is done.
 */

type Battle = Doc<"battles">
type Player = Doc<"battlePlayers">

const fail = (message: string) => new ConvexError(message)

/** The open battle with a code, or the latest one if they've all closed. */
async function findBattle(ctx: QueryCtx, code: string) {
  const battles = await ctx.db
    .query("battles")
    .withIndex("by_code_and_status", (q) => q.eq("code", code))
    .order("desc")
    .take(20)
  return battles.find((battle) => battle.status !== "closed") ?? battles[0]
}

async function playersOf(ctx: QueryCtx, battleId: Id<"battles">) {
  return ctx.db
    .query("battlePlayers")
    .withIndex("by_battleId_and_userId", (q) => q.eq("battleId", battleId))
    .take(MAX_PLAYERS)
}

const isActive = (player: Player) => player.leftAt === null

async function findPlayer(
  ctx: QueryCtx,
  battleId: Id<"battles">,
  userId: string
) {
  return ctx.db
    .query("battlePlayers")
    .withIndex("by_battleId_and_userId", (q) =>
      q.eq("battleId", battleId).eq("userId", userId)
    )
    .unique()
}

/** The battle by code, with the caller as an active player in it. */
async function requirePlayer(ctx: QueryCtx, code: string, userId: string) {
  const battle = await findBattle(ctx, code)
  if (!battle || battle.status === "closed")
    throw fail("That battle has ended or doesn't exist")
  const player = await findPlayer(ctx, battle._id, userId)
  if (!player || !isActive(player)) throw fail("You're not in this battle")
  return { battle, player }
}

async function submissionsOf(ctx: QueryCtx, battleId: Id<"battles">) {
  return ctx.db
    .query("battleSubmissions")
    .withIndex("by_battleId_and_order", (q) => q.eq("battleId", battleId))
    .take(MAX_PLAYERS)
}

async function kitVotesOf(ctx: QueryCtx, battleId: Id<"battles">) {
  return ctx.db
    .query("battleKitVotes")
    .withIndex("by_battleId_and_userId", (q) => q.eq("battleId", battleId))
    .take(MAX_PLAYERS)
}

async function votesOf(ctx: QueryCtx, battleId: Id<"battles">) {
  return ctx.db
    .query("battleVotes")
    .withIndex("by_battleId_and_voterId_and_submissionId", (q) =>
      q.eq("battleId", battleId)
    )
    .take(MAX_PLAYERS * MAX_PLAYERS)
}

/** Free sample kits that install into the app's browser. */
async function kitCandidates(ctx: QueryCtx) {
  const products = await ctx.db
    .query("products")
    .withIndex("by_published_and_sortOrder", (q) => q.eq("published", true))
    .take(200)
  return products.filter(
    (product) =>
      product.purchase.kind === "free" &&
      (product.category === "Drum kits" || product.category === "Sound kits") &&
      product.artifacts.some((file) => file.install === "samples")
  )
}

// ---------------------------------------------------------------------------
// Phases

async function schedule(
  ctx: MutationCtx,
  battle: Battle,
  from: Battle["status"],
  at: number
) {
  await ctx.scheduler.runAt(at, internal.battles.advance, {
    battleId: battle._id,
    from,
  })
}

async function beginMaking(
  ctx: MutationCtx,
  battle: Battle,
  kitId: Id<"products"> | null
) {
  const submitBy = Date.now() + battle.minutes * 60_000
  const phaseEndsAt = submitBy + SUBMIT_GRACE_MS
  await ctx.db.patch("battles", battle._id, {
    status: "making",
    kitId,
    submitBy,
    phaseEndsAt,
  })
  await schedule(ctx, battle, "making", phaseEndsAt)
}

async function endKitVote(ctx: MutationCtx, battle: Battle) {
  const votes = await kitVotesOf(ctx, battle._id)
  const kitId = kitWinner(
    battle.kitOptions,
    votes.map((vote) => vote.productId),
    Math.random
  )
  await beginMaking(ctx, battle, kitId)
}

async function beginListening(ctx: MutationCtx, battle: Battle) {
  const submissions = await submissionsOf(ctx, battle._id)
  if (submissions.length === 0) return finish(ctx, battle)
  const order = pickRandom(
    submissions.map((_, i) => i),
    Math.random,
    submissions.length
  )
  for (const [i, submission] of submissions.entries())
    await ctx.db.patch("battleSubmissions", submission._id, { order: order[i] })
  const phaseEndsAt = Date.now() + listeningMs(submissions.length)
  await ctx.db.patch("battles", battle._id, {
    status: "listening",
    phaseEndsAt,
  })
  await schedule(ctx, battle, "listening", phaseEndsAt)
}

async function finish(ctx: MutationCtx, battle: Battle) {
  const [submissions, votes, players] = await Promise.all([
    submissionsOf(ctx, battle._id),
    votesOf(ctx, battle._id),
    playersOf(ctx, battle._id),
  ])
  const ranked = rankSubmissions(
    submissions.map((submission) => submission._id),
    votes.map((vote) => ({ submission: vote.submissionId, score: vote.score }))
  )
  for (const { id, average, votes: count, rank, points } of ranked) {
    await ctx.db.patch("battleSubmissions", id, {
      result: { average, votes: count, rank, points },
    })
    const submission = submissions.find((item) => item._id === id)!
    const player = players.find((item) => item.userId === submission.userId)
    const stats = await ctx.db
      .query("battleStats")
      .withIndex("by_userId", (q) => q.eq("userId", submission.userId))
      .unique()
    const won = rank === 1 && average !== null && ranked.length > 1 ? 1 : 0
    if (stats)
      await ctx.db.patch("battleStats", stats._id, {
        name: player?.name ?? stats.name,
        battles: stats.battles + 1,
        wins: stats.wins + won,
        points: stats.points + points,
      })
    else
      await ctx.db.insert("battleStats", {
        userId: submission.userId,
        name: player?.name ?? "Producer",
        battles: 1,
        wins: won,
        points,
      })
  }
  await ctx.db.patch("battles", battle._id, {
    status: "results",
    phaseEndsAt: null,
  })
  await ctx.scheduler.runAfter(
    BEAT_RETENTION_MS,
    internal.battles.deleteBeats,
    { battleId: battle._id }
  )
}

/** Deletes a finished battle's audio, keeping the submissions for the results. */
async function deleteBeatFiles(ctx: MutationCtx, battleId: Id<"battles">) {
  for (const submission of await submissionsOf(ctx, battleId)) {
    if (!submission.storageId) continue
    await ctx.storage.delete(submission.storageId)
    await ctx.db.patch("battleSubmissions", submission._id, {
      storageId: null,
    })
  }
}

export const deleteBeats = internalMutation({
  args: { battleId: v.id("battles") },
  handler: (ctx, { battleId }) => deleteBeatFiles(ctx, battleId),
})

/** Ends the current phase early once every active player is done with it. */
async function maybeAdvance(ctx: MutationCtx, battleId: Id<"battles">) {
  const battle = await ctx.db.get("battles", battleId)
  if (!battle) return
  const active = (await playersOf(ctx, battle._id)).filter(isActive)
  if (active.length === 0) {
    if (battle.status !== "results") {
      await ctx.db.patch("battles", battle._id, {
        status: "closed",
        phaseEndsAt: null,
      })
      await deleteBeatFiles(ctx, battle._id)
    }
    return
  }
  const done = (userIds: Set<string>) =>
    active.every((player) => userIds.has(player.userId))

  if (battle.status === "kitVote") {
    const votes = await kitVotesOf(ctx, battle._id)
    if (done(new Set(votes.map((vote) => vote.userId))))
      await endKitVote(ctx, battle)
  } else if (battle.status === "making") {
    const submissions = await submissionsOf(ctx, battle._id)
    if (done(new Set(submissions.map((item) => item.userId))))
      await beginListening(ctx, battle)
  } else if (battle.status === "listening") {
    const [submissions, votes] = await Promise.all([
      submissionsOf(ctx, battle._id),
      votesOf(ctx, battle._id),
    ])
    const finished = new Set(
      active
        .filter((player) =>
          submissions.every(
            (submission) =>
              submission.userId === player.userId ||
              votes.some(
                (vote) =>
                  vote.voterId === player.userId &&
                  vote.submissionId === submission._id
              )
          )
        )
        .map((player) => player.userId)
    )
    if (done(finished)) await finish(ctx, battle)
  }
}

/** A phase's deadline; does nothing if the phase already ended early. */
export const advance = internalMutation({
  args: { battleId: v.id("battles"), from: battleStatus },
  handler: async (ctx, { battleId, from }) => {
    const battle = await ctx.db.get("battles", battleId)
    if (!battle || battle.status !== from) return
    if (from === "kitVote") await endKitVote(ctx, battle)
    else if (from === "making") await beginListening(ctx, battle)
    else if (from === "listening") await finish(ctx, battle)
  },
})

// ---------------------------------------------------------------------------
// Joining and leaving

async function leave(ctx: MutationCtx, battle: Battle, player: Player) {
  if (battle.status === "results" || battle.status === "closed") return
  if (battle.status === "lobby")
    await ctx.db.delete("battlePlayers", player._id)
  else await ctx.db.patch("battlePlayers", player._id, { leftAt: Date.now() })

  if (battle.hostId === player.userId) {
    const next = (await playersOf(ctx, battle._id))
      .filter((other) => other._id !== player._id && isActive(other))
      .sort((a, b) => a.joinedAt - b.joinedAt)[0]
    if (next) await ctx.db.patch("battles", battle._id, { hostId: next.userId })
  }
  await maybeAdvance(ctx, battle._id)
}

/** Takes the user out of any battle they're still playing, so they're in one at a time. */
async function leaveCurrent(ctx: MutationCtx, userId: string) {
  const rows = await ctx.db
    .query("battlePlayers")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .order("desc")
    .take(20)
  for (const row of rows) {
    if (!isActive(row)) continue
    const battle = await ctx.db.get("battles", row.battleId)
    if (battle) await leave(ctx, battle, row)
  }
}

const playerArgs = { ...secretArg, userId: v.string() }

/** Opens a lobby with the user as host; returns its invite code. */
export const create = mutation({
  args: {
    ...playerArgs,
    name: v.string(),
    minutes: v.number(),
    awma: v.boolean(),
  },
  handler: async (ctx, { secret, userId, name, minutes, awma }) => {
    checkSecret(secret)
    if (!battleLengths.some((length) => length === minutes))
      throw fail(`A battle lasts ${battleLengths.join(", ")} minutes`)
    await leaveCurrent(ctx, userId)

    let code = makeCode(Math.random)
    for (let tries = 0; tries < 10; tries++) {
      const taken = await findBattle(ctx, code)
      if (!taken || taken.status === "closed") break
      code = makeCode(Math.random)
    }
    const now = Date.now()
    const battleId = await ctx.db.insert("battles", {
      code,
      hostId: userId,
      status: "lobby",
      minutes,
      awma,
      kitOptions: [],
      kitId: null,
      phaseEndsAt: null,
      submitBy: null,
      createdAt: now,
    })
    await ctx.db.insert("battlePlayers", {
      battleId,
      userId,
      name,
      joinedAt: now,
      leftAt: null,
    })
    return code
  },
})

export const join = mutation({
  args: { ...playerArgs, code: v.string(), name: v.string() },
  handler: async (ctx, { secret, userId, code, name }) => {
    checkSecret(secret)
    const battle = await findBattle(ctx, code)
    if (!battle || battle.status === "closed")
      throw fail("That battle has ended or doesn't exist")
    const existing = await findPlayer(ctx, battle._id, userId)
    if (existing && isActive(existing)) return
    if (battle.status !== "lobby") throw fail("That battle has already started")
    const players = await playersOf(ctx, battle._id)
    if (players.length >= MAX_PLAYERS) throw fail("That battle is full")
    await leaveCurrent(ctx, userId)
    await ctx.db.insert("battlePlayers", {
      battleId: battle._id,
      userId,
      name,
      joinedAt: Date.now(),
      leftAt: null,
    })
  },
})

export const leaveBattle = mutation({
  args: { ...playerArgs, code: v.string() },
  handler: async (ctx, { secret, userId, code }) => {
    checkSecret(secret)
    const battle = await findBattle(ctx, code)
    const player = battle && (await findPlayer(ctx, battle._id, userId))
    if (battle && player && isActive(player)) await leave(ctx, battle, player)
  },
})

/** The host starts the battle: the kit vote, or straight to making beats if no free kits are listed. */
export const start = mutation({
  args: { ...playerArgs, code: v.string() },
  handler: async (ctx, { secret, userId, code }) => {
    checkSecret(secret)
    const { battle } = await requirePlayer(ctx, code, userId)
    if (battle.hostId !== userId) throw fail("Only the host can start")
    if (battle.status !== "lobby") throw fail("The battle has already started")
    const players = await playersOf(ctx, battle._id)
    if (players.length < MIN_PLAYERS)
      throw fail(`A battle needs at least ${MIN_PLAYERS} players`)

    const kits = pickRandom(await kitCandidates(ctx), Math.random, KIT_OPTIONS)
    if (kits.length === 0) return beginMaking(ctx, battle, null)
    const phaseEndsAt = Date.now() + KIT_VOTE_MS
    await ctx.db.patch("battles", battle._id, {
      status: "kitVote",
      kitOptions: kits.map((kit) => kit._id),
      phaseEndsAt,
    })
    await schedule(ctx, battle, "kitVote", phaseEndsAt)
  },
})

// ---------------------------------------------------------------------------
// Playing

export const voteKit = mutation({
  args: { ...playerArgs, code: v.string(), slug: v.string() },
  handler: async (ctx, { secret, userId, code, slug }) => {
    checkSecret(secret)
    const { battle } = await requirePlayer(ctx, code, userId)
    if (battle.status !== "kitVote") throw fail("The kit vote is over")
    const product = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique()
    if (!product || !battle.kitOptions.includes(product._id))
      throw fail("That kit isn't one of the options")
    const existing = await ctx.db
      .query("battleKitVotes")
      .withIndex("by_battleId_and_userId", (q) =>
        q.eq("battleId", battle._id).eq("userId", userId)
      )
      .unique()
    if (existing)
      await ctx.db.patch("battleKitVotes", existing._id, {
        productId: product._id,
      })
    else
      await ctx.db.insert("battleKitVotes", {
        battleId: battle._id,
        userId,
        productId: product._id,
      })
    await maybeAdvance(ctx, battle._id)
  },
})

function requireSubmitWindow(battle: Battle) {
  if (
    battle.status !== "making" ||
    battle.phaseEndsAt === null ||
    Date.now() > battle.phaseEndsAt
  )
    throw fail("Submissions are closed")
}

/** Where the app uploads its exported beat (POST the file, with its Content-Type). */
export const generateUploadUrl = mutation({
  args: { ...playerArgs, code: v.string() },
  handler: async (ctx, { secret, userId, code }) => {
    checkSecret(secret)
    const { battle } = await requirePlayer(ctx, code, userId)
    requireSubmitWindow(battle)
    return ctx.storage.generateUploadUrl()
  },
})

const hex = (base64: string) =>
  Array.from(atob(base64), (char) =>
    char.charCodeAt(0).toString(16).padStart(2, "0")
  ).join("")

/**
 * Enters an uploaded beat, replacing the player's earlier one. A rejected
 * upload is deleted and the reason returned (not thrown, so the delete
 * sticks).
 */
export const submit = mutation({
  args: {
    ...playerArgs,
    code: v.string(),
    storageId: v.string(),
    fileName: v.string(),
    usedAwma: v.boolean(),
  },
  handler: async (
    ctx,
    { secret, userId, code, storageId, fileName, usedAwma }
  ): Promise<{ error: string } | { error: null }> => {
    checkSecret(secret)
    const fileId = ctx.db.system.normalizeId("_storage", storageId)
    const file = fileId && (await ctx.db.system.get("_storage", fileId))
    if (!fileId || !file) throw fail("The upload is missing")
    const reject = async (error: string) => {
      await ctx.storage.delete(fileId)
      return { error }
    }
    let battle: Battle
    try {
      battle = (await requirePlayer(ctx, code, userId)).battle
      requireSubmitWindow(battle)
    } catch (error) {
      if (error instanceof ConvexError) return reject(error.data as string)
      throw error
    }
    if (file.size > MAX_SUBMISSION_BYTES)
      return reject(
        `Beats can be up to ${MAX_SUBMISSION_BYTES / 1024 / 1024} MB`
      )
    const contentType = submissionType(file.contentType, fileName)
    if (!contentType) return reject("Submit an MP3 or WAV file")
    if (usedAwma && !battle.awma)
      return reject("Awma isn't allowed in this battle")

    const fields = {
      storageId: fileId,
      fileName: fileName.slice(0, 200),
      byteLength: file.size,
      sha256: hex(file.sha256),
      contentType,
      usedAwma,
      submittedAt: Date.now(),
    }
    const existing = await ctx.db
      .query("battleSubmissions")
      .withIndex("by_battleId_and_userId", (q) =>
        q.eq("battleId", battle._id).eq("userId", userId)
      )
      .unique()
    if (existing?.storageId === fileId) return { error: null }
    if (existing) {
      if (existing.storageId) await ctx.storage.delete(existing.storageId)
      await ctx.db.patch("battleSubmissions", existing._id, fields)
    } else
      await ctx.db.insert("battleSubmissions", {
        ...fields,
        battleId: battle._id,
        userId,
        order: 0,
        result: null,
      })
    await maybeAdvance(ctx, battle._id)
    return { error: null }
  },
})

/** Rates another player's beat from 1 to 5; rating it again changes the score. */
export const vote = mutation({
  args: {
    ...playerArgs,
    code: v.string(),
    submissionId: v.string(),
    score: v.number(),
  },
  handler: async (ctx, { secret, userId, code, submissionId, score }) => {
    checkSecret(secret)
    const { battle } = await requirePlayer(ctx, code, userId)
    if (battle.status !== "listening") throw fail("Voting is closed")
    if (!Number.isInteger(score) || score < MIN_SCORE || score > MAX_SCORE)
      throw fail(`Scores go from ${MIN_SCORE} to ${MAX_SCORE}`)
    const id = ctx.db.normalizeId("battleSubmissions", submissionId)
    const submission = id && (await ctx.db.get("battleSubmissions", id))
    if (!submission || submission.battleId !== battle._id)
      throw fail("That beat isn't in this battle")
    if (submission.userId === userId)
      throw fail("You can't vote for your own beat")

    const existing = await ctx.db
      .query("battleVotes")
      .withIndex("by_battleId_and_voterId_and_submissionId", (q) =>
        q
          .eq("battleId", battle._id)
          .eq("voterId", userId)
          .eq("submissionId", submission._id)
      )
      .unique()
    if (existing) await ctx.db.patch("battleVotes", existing._id, { score })
    else
      await ctx.db.insert("battleVotes", {
        battleId: battle._id,
        voterId: userId,
        submissionId: submission._id,
        score,
      })
    await maybeAdvance(ctx, battle._id)
  },
})

// ---------------------------------------------------------------------------
// Reading

async function kitView(ctx: QueryCtx, id: Id<"products">) {
  const product = await ctx.db.get("products", id)
  if (!product) return null
  return {
    slug: product.slug,
    title: product.title,
    vendor: product.vendor,
    imageUrl: product.image ? await ctx.storage.getUrl(product.image) : null,
  }
}

/**
 * The battle as one player sees it. Beats are anonymous while listening;
 * names and scores show in the results.
 */
export const get = query({
  args: { ...playerArgs, code: v.string() },
  handler: async (ctx, { secret, userId, code }) => {
    checkSecret(secret)
    const battle = await findBattle(ctx, code)
    if (!battle) return null
    const you = await findPlayer(ctx, battle._id, userId)
    if (!you) return null

    const [players, kitVotes, submissions, votes] = await Promise.all([
      playersOf(ctx, battle._id),
      kitVotesOf(ctx, battle._id),
      submissionsOf(ctx, battle._id),
      votesOf(ctx, battle._id),
    ])
    const revealed = battle.status === "results"
    const listening = battle.status === "listening" || revealed

    const kitOptions = []
    for (const id of battle.kitOptions) {
      const kit = await kitView(ctx, id)
      if (kit)
        kitOptions.push({
          ...kit,
          votes: kitVotes.filter((vote) => vote.productId === id).length,
          yourVote: kitVotes.some(
            (vote) => vote.productId === id && vote.userId === userId
          ),
        })
    }

    const yours = submissions.find((item) => item.userId === userId)
    const beats = []
    if (listening)
      for (const [i, submission] of submissions.entries()) {
        const name = players.find(
          (player) => player.userId === submission.userId
        )?.name
        beats.push({
          id: submission._id,
          label: trackLabel(i),
          url: submission.storageId
            ? await ctx.storage.getUrl(submission.storageId)
            : null,
          fileName: submission.fileName,
          byteLength: submission.byteLength,
          sha256: submission.sha256,
          contentType: submission.contentType,
          usedAwma: submission.usedAwma,
          isYours: submission.userId === userId,
          yourScore:
            votes.find(
              (vote) =>
                vote.voterId === userId && vote.submissionId === submission._id
            )?.score ?? null,
          by: revealed ? (name ?? "Producer") : null,
          result: revealed ? submission.result : null,
        })
      }
    if (revealed)
      beats.sort((a, b) => (a.result?.rank ?? 0) - (b.result?.rank ?? 0))

    return {
      code: battle.code,
      status: battle.status,
      minutes: battle.minutes,
      awma: battle.awma,
      isHost: battle.hostId === userId,
      left: !isActive(you),
      phaseEndsAt: battle.phaseEndsAt,
      submitBy: battle.submitBy,
      players: players
        .sort((a, b) => a.joinedAt - b.joinedAt)
        .map((player) => ({
          name: player.name,
          isHost: player.userId === battle.hostId,
          isYou: player.userId === userId,
          left: !isActive(player),
          votedKit: kitVotes.some((vote) => vote.userId === player.userId),
          submitted: submissions.some(
            (submission) => submission.userId === player.userId
          ),
        })),
      kitOptions,
      kit: battle.kitId ? await kitView(ctx, battle.kitId) : null,
      yourSubmission: yours
        ? {
            fileName: yours.fileName,
            byteLength: yours.byteLength,
            sha256: yours.sha256,
            submittedAt: yours.submittedAt,
          }
        : null,
      beats,
    }
  },
})

/** The battle the user is still playing, if any, so the app can pick it back up. */
export const current = query({
  args: playerArgs,
  handler: async (ctx, { secret, userId }) => {
    checkSecret(secret)
    const rows = await ctx.db
      .query("battlePlayers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(20)
    for (const row of rows) {
      if (!isActive(row)) continue
      const battle = await ctx.db.get("battles", row.battleId)
      if (battle && battle.status !== "results" && battle.status !== "closed")
        return battle.code
    }
    return null
  },
})

export const leaderboard = query({
  args: { ...secretArg, limit: v.number() },
  handler: async (ctx, { secret, limit }) => {
    checkSecret(secret)
    const rows = await ctx.db
      .query("battleStats")
      .withIndex("by_points")
      .order("desc")
      .take(Math.min(Math.max(1, Math.floor(limit)), 100))
    return rows.map(({ name, battles, wins, points }) => ({
      name,
      battles,
      wins,
      points,
    }))
  },
})

/** Closes lobbies that never started. */
export const closeStale = internalMutation({
  args: {},
  handler: async (ctx) => {
    const stale = await ctx.db
      .query("battles")
      .withIndex("by_status_and_createdAt", (q) =>
        q.eq("status", "lobby").lt("createdAt", Date.now() - LOBBY_TTL_MS)
      )
      .take(200)
    for (const battle of stale)
      await ctx.db.patch("battles", battle._id, { status: "closed" })
  },
})
