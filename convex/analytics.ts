import { HOUR, RateLimiter } from "@convex-dev/rate-limiter"
import { v } from "convex/values"

import { components } from "./_generated/api"
import { mutation } from "./_generated/server"
import { analyticsEventName } from "./schema"
import { checkSecret, secretArg } from "./server"

/** Batches per install: the app sends one every ten minutes, more after being offline. */
const rateLimiter = new RateLimiter(components.rateLimiter, {
  analyticsBatches: {
    kind: "token bucket",
    rate: 30,
    period: HOUR,
    capacity: 60,
  },
})

/** How long analytics are kept (ms). */
const RETENTION = 400 * 24 * HOUR
/** Most events one batch can hold; the route checks this too. */
export const MAX_EVENTS = 500

/** Stores a batch of the desktop app's analytics; false if the install sends too often. */
export const record = mutation({
  args: {
    ...secretArg,
    installId: v.string(),
    app: v.object({
      version: v.string(),
      platform: v.string(),
      os: v.string(),
      arch: v.string(),
    }),
    events: v.array(
      v.object({
        name: analyticsEventName,
        at: v.number(),
        props: v.record(
          v.string(),
          v.union(v.string(), v.number(), v.boolean())
        ),
      })
    ),
  },
  handler: async (ctx, { secret, installId, app, events }) => {
    checkSecret(secret)
    const { ok } = await rateLimiter.limit(ctx, "analyticsBatches", {
      key: installId,
    })
    if (!ok) return false
    const expiresAt = Date.now() + RETENTION
    for (const event of events.slice(0, MAX_EVENTS))
      await ctx.db.insert("analyticsEvents", {
        installId,
        ...event,
        appVersion: app.version,
        platform: app.platform,
        os: app.os,
        arch: app.arch,
        expiresAt,
      })
    return true
  },
})
