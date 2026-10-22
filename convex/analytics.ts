import { HOUR, RateLimiter } from "@convex-dev/rate-limiter"
import { v } from "convex/values"

import { components } from "./_generated/api"
import { mutation } from "./_generated/server"
import { dayOf, mergeEvents } from "./analyticsRollup"
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

/** Merges a batch of the desktop app's analytics into its days; false if the install sends too often. */
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

    const days = new Map<number, typeof events>()
    for (const event of events.slice(0, MAX_EVENTS)) {
      const day = dayOf(event.at)
      days.set(day, [...(days.get(day) ?? []), event])
    }
    for (const [day, dayEvents] of days) {
      const row = await ctx.db
        .query("analyticsDays")
        .withIndex("by_installId_and_day_and_appVersion", (q) =>
          q
            .eq("installId", installId)
            .eq("day", day)
            .eq("appVersion", app.version)
        )
        .unique()
      const fields = {
        platform: app.platform,
        os: app.os,
        arch: app.arch,
        events: mergeEvents(row?.events ?? [], dayEvents),
      }
      if (row) await ctx.db.patch("analyticsDays", row._id, fields)
      else
        await ctx.db.insert("analyticsDays", {
          ...fields,
          installId,
          day,
          appVersion: app.version,
          expiresAt: day + RETENTION,
        })
    }
    return true
  },
})
