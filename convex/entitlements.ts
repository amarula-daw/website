import { v } from "convex/values"

import { mutation, query } from "./_generated/server"
import { entitlement } from "./schema"
import { checkSecret, secretArg } from "./server"

/** The user's cached entitlement, if it hasn't expired. */
export const get = query({
  args: { ...secretArg, userId: v.string() },
  handler: async (ctx, { secret, userId }) => {
    checkSecret(secret)
    const row = await ctx.db
      .query("entitlements")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique()
    return row && row.expiresAt > Date.now() ? row.entitlement : null
  },
})

export const set = mutation({
  args: { ...secretArg, userId: v.string(), entitlement, ttl: v.number() },
  handler: async (ctx, { secret, userId, entitlement, ttl }) => {
    checkSecret(secret)
    const expiresAt = Date.now() + ttl
    const row = await ctx.db
      .query("entitlements")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique()
    if (row) await ctx.db.patch(row._id, { entitlement, expiresAt })
    else await ctx.db.insert("entitlements", { userId, entitlement, expiresAt })
  },
})
