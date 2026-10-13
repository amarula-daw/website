import { ConvexError, v } from "convex/values"

/**
 * These functions are public so the website's server can call them, but
 * only it knows CONVEX_SERVER_SECRET (set in both the Convex deployment and
 * the website's environment).
 */
export const secretArg = { secret: v.string() }

export function checkSecret(secret: string) {
  const expected = process.env.CONVEX_SERVER_SECRET
  if (!expected || secret !== expected) throw new ConvexError("Unauthorized")
}
