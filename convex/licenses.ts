import { v } from "convex/values"

import { awmaPack } from "../lib/daw-subscription"
import { internalMutation, mutation, query } from "./_generated/server"
import type { MutationCtx } from "./_generated/server"
import { checkSecret, secretArg } from "./server"

/*
 * The DAW's lifetime licenses and Awma packs: one-time purchases through
 * Stripe Checkout (lib/stripe.ts), fulfilled by its webhook, and taken back
 * if the payment is refunded or disputed. Licenses for testers are given with
 * `bunx convex run licenses:comp '{"userId": "user_…"}'`.
 */

const product = v.union(v.literal("license"), v.literal("awmaPack"))

async function findLicense(ctx: MutationCtx, userId: string) {
  return await ctx.db
    .query("licenses")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique()
}

/** The user's license, if they have one. */
export const get = query({
  args: { ...secretArg, userId: v.string() },
  handler: async (ctx, { secret, userId }) => {
    checkSecret(secret)
    const license = await ctx.db
      .query("licenses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique()
    return license ? { grantedAt: license.grantedAt } : null
  },
})

async function grantLicense(
  ctx: MutationCtx,
  userId: string,
  source: "purchase" | "comp"
) {
  if (!(await findLicense(ctx, userId)))
    await ctx.db.insert("licenses", { userId, grantedAt: Date.now(), source })
}

async function addCredits(ctx: MutationCtx, userId: string, micros: number) {
  const credits = await ctx.db
    .query("awmaCredits")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique()
  if (credits)
    await ctx.db.patch(credits._id, {
      micros: Math.max(0, credits.micros + micros),
    })
  else if (micros > 0) await ctx.db.insert("awmaCredits", { userId, micros })
}

/**
 * Gives the user what they paid for, once per Checkout session: a license,
 * or an Awma pack's credit. Returns false if this session was already used.
 */
export const fulfill = mutation({
  args: {
    ...secretArg,
    userId: v.string(),
    product,
    reference: v.string(),
    paymentIntent: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { secret, userId, product, reference, paymentIntent }
  ) => {
    checkSecret(secret)
    const done = await ctx.db
      .query("purchases")
      .withIndex("by_reference", (q) => q.eq("reference", reference))
      .unique()
    if (done) return false
    await ctx.db.insert("purchases", {
      reference,
      userId,
      product,
      at: Date.now(),
      paymentIntent,
    })

    if (product === "license") await grantLicense(ctx, userId, "purchase")
    else await addCredits(ctx, userId, awmaPack.awmaMicros)
    return true
  },
})

/**
 * Takes back a purchase whose payment was refunded or disputed: the license
 * it bought, or its pack's credit (what's left of it). Once per purchase.
 */
export const revoke = mutation({
  args: { ...secretArg, paymentIntent: v.string() },
  handler: async (ctx, { secret, paymentIntent }) => {
    checkSecret(secret)
    const purchase = await ctx.db
      .query("purchases")
      .withIndex("by_payment_intent", (q) =>
        q.eq("paymentIntent", paymentIntent)
      )
      .unique()
    if (!purchase || purchase.revoked) return false
    await ctx.db.patch(purchase._id, { revoked: true })

    if (purchase.product === "awmaPack") {
      await addCredits(ctx, purchase.userId, -awmaPack.awmaMicros)
      return true
    }
    // A tester's free license stays.
    const license = await findLicense(ctx, purchase.userId)
    if (license?.source === "purchase") await ctx.db.delete(license._id)
    return true
  },
})

/** A free license, e.g. for a tester (run from the Convex CLI or dashboard). */
export const comp = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    await grantLicense(ctx, userId, "comp")
  },
})
