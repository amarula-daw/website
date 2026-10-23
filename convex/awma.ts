import { DAY, MINUTE, RateLimiter } from "@convex-dev/rate-limiter"
import { v } from "convex/values"

import { components } from "./_generated/api"
import { mutation, query } from "./_generated/server"
import { checkSecret, secretArg } from "./server"

/** Requests per user: a burst limit and a daily one. */
const rateLimiter = new RateLimiter(components.rateLimiter, {
  awmaMinute: { kind: "token bucket", rate: 30, period: MINUTE },
  awmaDay: { kind: "token bucket", rate: 1500, period: DAY },
})

/** Requests one user can have running at once. */
const MAX_CONCURRENT = 2
/** How long a request can count as running if it never finishes cleanly (ms). */
const RUNNING_TTL = 10 * MINUTE
/** How long usage is kept past its window, for support questions (ms). */
const USAGE_RETENTION = 60 * DAY

/** Counts a request against the user's rate limits; false if it's over either. */
export const limit = mutation({
  args: { ...secretArg, userId: v.string() },
  handler: async (ctx, { secret, userId }) => {
    checkSecret(secret)
    // Check both first, so a request refused by one doesn't use up the other.
    for (const name of ["awmaMinute", "awmaDay"] as const)
      if (!(await rateLimiter.check(ctx, name, { key: userId })).ok)
        return false
    for (const name of ["awmaMinute", "awmaDay"] as const)
      await rateLimiter.limit(ctx, name, { key: userId })
    return true
  },
})

/**
 * Where the user stands this window, in micro-dollars: spent (against the
 * allowance, then packs), and what's left of their packs.
 */
export const standing = query({
  args: { ...secretArg, userId: v.string(), windowStart: v.number() },
  handler: async (ctx, { secret, userId, windowStart }) => {
    checkSecret(secret)
    const row = await ctx.db
      .query("usage")
      .withIndex("by_user_window", (q) =>
        q.eq("userId", userId).eq("windowStart", windowStart)
      )
      .unique()
    const credits = await ctx.db
      .query("awmaCredits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique()
    return { micros: row?.micros ?? 0, creditMicros: credits?.micros ?? 0 }
  },
})

/**
 * Charges a response's cost against the allowance; whatever goes past it
 * comes out of the user's packs. What they can't cover (a request let in
 * with a little left) is owed: the balance goes below zero, and the next
 * pack pays it first.
 */
export const charge = mutation({
  args: {
    ...secretArg,
    userId: v.string(),
    window: v.object({ start: v.number(), end: v.number() }),
    budgetMicros: v.number(),
    micros: v.number(),
  },
  handler: async (ctx, { secret, userId, window, budgetMicros, micros }) => {
    checkSecret(secret)
    if (micros <= 0) return
    const row = await ctx.db
      .query("usage")
      .withIndex("by_user_window", (q) =>
        q.eq("userId", userId).eq("windowStart", window.start)
      )
      .unique()
    const before = row?.micros ?? 0
    const after = before + micros
    if (row) await ctx.db.patch(row._id, { micros: after })
    else
      await ctx.db.insert("usage", {
        userId,
        windowStart: window.start,
        micros: after,
        expiresAt: window.end + USAGE_RETENTION,
      })

    const overflow =
      Math.max(0, after - budgetMicros) - Math.max(0, before - budgetMicros)
    if (overflow <= 0) return
    const credits = await ctx.db
      .query("awmaCredits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique()
    if (credits)
      await ctx.db.patch(credits._id, { micros: credits.micros - overflow })
    else await ctx.db.insert("awmaCredits", { userId, micros: -overflow })
  },
})

/** Counts a request as running; returns its id, or null if too many are. */
export const startRequest = mutation({
  args: { ...secretArg, userId: v.string() },
  handler: async (ctx, { secret, userId }) => {
    checkSecret(secret)
    const now = Date.now()
    const running = await ctx.db
      .query("running")
      .withIndex("by_user", (q) => q.eq("userId", userId).gt("expiresAt", now))
      .take(MAX_CONCURRENT)
    if (running.length >= MAX_CONCURRENT) return null
    return await ctx.db.insert("running", {
      userId,
      expiresAt: now + RUNNING_TTL,
    })
  },
})

export const endRequest = mutation({
  args: { ...secretArg, id: v.id("running") },
  handler: async (ctx, { secret, id }) => {
    checkSecret(secret)
    if (await ctx.db.get(id)) await ctx.db.delete(id)
  },
})
