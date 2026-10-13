import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export const entitlement = v.object({
  active: v.boolean(),
  planPeriod: v.union(v.literal("month"), v.literal("annual"), v.null()),
  renewsAt: v.union(v.number(), v.null()),
  endsAt: v.union(v.number(), v.null()),
  usageWindow: v.union(
    v.object({ start: v.number(), end: v.number() }),
    v.null()
  ),
})

export default defineSchema({
  /** Awma's Anthropic spend per user and usage window, in micro-dollars. */
  usage: defineTable({
    userId: v.string(),
    windowStart: v.number(),
    micros: v.number(),
    /** Kept a while past the window, for support questions (ms). */
    expiresAt: v.number(),
  })
    .index("by_user_window", ["userId", "windowStart"])
    .index("by_expiry", ["expiresAt"]),

  /** Awma requests in flight, for the per-user concurrency limit. */
  running: defineTable({ userId: v.string(), expiresAt: v.number() })
    .index("by_user", ["userId", "expiresAt"])
    .index("by_expiry", ["expiresAt"]),

  /** Subscription checks, reused for a few minutes before asking Clerk again. */
  entitlements: defineTable({
    userId: v.string(),
    entitlement,
    expiresAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_expiry", ["expiresAt"]),
})
