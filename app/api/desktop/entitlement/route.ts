import { auth, clerkClient } from "@clerk/nextjs/server"

import { awmaMode, MIN_CREDIT_MICROS } from "@/lib/awma/mode"
import { getStanding } from "@/lib/awma/proxy"
import { getDawPlan } from "@/lib/daw-subscription"
import { getEntitlement, getLicense } from "@/lib/desktop/entitlement"

const iso = (time: number | null) =>
  time === null ? null : new Date(time).toISOString()

const cents = (micros: number) => Math.ceil(micros / 10_000)

/**
 * GET /api/desktop/entitlement: what the desktop app needs, for the user its
 * Clerk OAuth access token belongs to: who they are, whether they own the
 * DAW's license, whether their subscription (Awma and the cloud) is active,
 * and this month's Awma usage.
 */
export async function GET() {
  const session = await auth({ acceptsToken: "oauth_token" })
  if (!session.isAuthenticated)
    return Response.json({ error: "Sign in again" }, { status: 401 })

  const client = await clerkClient()
  const [user, license, entitlement] = await Promise.all([
    client.users.getUser(session.userId),
    getLicense(session.userId),
    getEntitlement(session.userId),
  ])
  const window = entitlement.plan ? entitlement.usageWindow : null
  const standing = window
    ? await getStanding(session.userId, window.start)
    : null
  const budgetMicros = entitlement.plan
    ? getDawPlan(entitlement.plan).awmaBudgetMicros
    : 0

  return Response.json(
    {
      user: {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? "",
        name: user.fullName,
      },
      license: {
        active: license !== null,
        grantedAt: iso(license?.grantedAt ?? null),
      },
      subscription: {
        active: entitlement.active,
        plan: entitlement.plan,
        planPeriod: entitlement.planPeriod,
        renewsAt: iso(entitlement.renewsAt),
        endsAt: iso(entitlement.endsAt),
      },
      usage:
        window && standing
          ? {
              usedCents: Math.min(cents(standing.micros), cents(budgetMicros)),
              limitCents: cents(budgetMicros),
              // Less than a request's worth (or what's owed) can't be used.
              creditCents:
                standing.creditMicros >= MIN_CREDIT_MICROS
                  ? cents(standing.creditMicros)
                  : 0,
              mode: awmaMode(standing, budgetMicros),
              resetsAt: iso(window.end),
            }
          : null,
    },
    { headers: { "cache-control": "no-store" } }
  )
}
