import { auth, clerkClient } from "@clerk/nextjs/server"
import { ConvexError } from "convex/values"

import { api } from "@/convex/_generated/api"
import { normalizeCode } from "@/convex/battleRules"
import { convexQuery } from "@/lib/desktop/convex"
import { getEntitlement } from "@/lib/desktop/entitlement"

/*
 * Shared by the /api/battles routes: the desktop app's Clerk OAuth token
 * says who's playing, and battles need an active subscription, like the DAW.
 */

export const noStore = { "cache-control": "no-store" }

export const error = (status: number, message: string) =>
  Response.json({ error: message }, { status, headers: noStore })

/** Runs a battle request for the signed-in subscriber; battle rule errors become 400s. */
export async function asPlayer(
  handler: (userId: string) => Promise<Response>
): Promise<Response> {
  const session = await auth({ acceptsToken: "oauth_token" })
  if (!session.isAuthenticated)
    return error(401, "Sign in to Amarula again to play beat battles.")
  const entitlement = await getEntitlement(session.userId)
  if (!entitlement.active)
    return error(403, "Beat battles need an active Amarula subscription.")
  try {
    return await handler(session.userId)
  } catch (thrown) {
    if (thrown instanceof ConvexError && typeof thrown.data === "string")
      return error(400, thrown.data)
    throw thrown
  }
}

/** The name other players see: the username, else the first or full name. */
export async function displayName(userId: string) {
  const user = await (await clerkClient()).users.getUser(userId)
  const name = user.username ?? user.firstName ?? user.fullName ?? ""
  return name.trim().slice(0, 40) || "Producer"
}

/** The code from a URL, or null when it can't be an invite code. */
export async function codeParam(params: Promise<{ code: string }>) {
  return normalizeCode((await params).code)
}

/** The battle as this player sees it, with the server's clock for countdowns. */
export async function battleResponse(userId: string, code: string) {
  const battle = await convexQuery(api.battles.get, { userId, code })
  if (!battle) return error(404, "That battle doesn't exist.")
  return Response.json({ battle, serverTime: Date.now() }, { headers: noStore })
}

/** A request's JSON body as an object; empty when there's none or it isn't JSON. */
export async function jsonBody(request: Request) {
  const body: unknown = await request.json().catch(() => null)
  return body && typeof body === "object"
    ? (body as Record<string, unknown>)
    : {}
}
