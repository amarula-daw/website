import { auth, clerkClient } from "@clerk/nextjs/server"

import { getUsageMicros, MONTHLY_BUDGET_MICROS } from "@/lib/awma/proxy"
import { getEntitlement } from "@/lib/desktop/entitlement"

const iso = (time: number | null) =>
  time === null ? null : new Date(time).toISOString()

/**
 * GET /api/desktop/entitlement: what the desktop app needs to unlock itself,
 * for the user its Clerk OAuth access token belongs to: who they are,
 * whether their subscription is active, and this month's Awma usage.
 */
export async function GET() {
  const session = await auth({ acceptsToken: "oauth_token" })
  if (!session.isAuthenticated)
    return Response.json({ error: "Sign in again" }, { status: 401 })

  const client = await clerkClient()
  const [user, entitlement] = await Promise.all([
    client.users.getUser(session.userId),
    getEntitlement(session.userId),
  ])
  const window = entitlement.usageWindow
  const usedMicros = window
    ? await getUsageMicros(session.userId, window.start)
    : 0

  return Response.json(
    {
      user: {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? "",
        name: user.fullName,
      },
      subscription: {
        active: entitlement.active,
        planPeriod: entitlement.planPeriod,
        renewsAt: iso(entitlement.renewsAt),
        endsAt: iso(entitlement.endsAt),
      },
      usage: window
        ? {
            usedCents: Math.min(
              Math.ceil(usedMicros / 10_000),
              MONTHLY_BUDGET_MICROS / 10_000
            ),
            limitCents: MONTHLY_BUDGET_MICROS / 10_000,
            resetsAt: iso(window.end),
          }
        : null,
    },
    { headers: { "cache-control": "no-store" } }
  )
}
