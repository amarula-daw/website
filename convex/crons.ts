import { cronJobs } from "convex/server"

import { internal } from "./_generated/api"
import { internalMutation } from "./_generated/server"

/** Deletes expired usage, running requests and cached entitlements. */
export const cleanUp = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    for (const table of ["usage", "running", "entitlements"] as const) {
      const expired = await ctx.db
        .query(table)
        .withIndex("by_expiry", (q) => q.lt("expiresAt", now))
        .take(500)
      for (const row of expired) await ctx.db.delete(row._id)
    }
  },
})

const crons = cronJobs()
crons.hourly("clean up expired rows", { minuteUTC: 0 }, internal.crons.cleanUp)
crons.interval(
  "close stale battle lobbies",
  { hours: 1 },
  internal.battles.closeStale
)
export default crons
