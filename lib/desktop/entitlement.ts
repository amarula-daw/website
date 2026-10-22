import { clerkClient } from "@clerk/nextjs/server"

import { api } from "@/convex/_generated/api"
import { convexMutation, convexQuery } from "@/lib/desktop/convex"
import {
  dawPlanId,
  dawPlans,
  legacyPlanIds,
  type DawPlanKey,
} from "@/lib/daw-subscription"

/** How long a subscription check is reused before asking Clerk again. */
const CACHE_MS = 5 * 60 * 1000

/** Whether a user has the subscription (Awma and the cloud), and their usage window. */
export type Entitlement = {
  active: boolean
  /** Which plan; null without a subscription. */
  plan: DawPlanKey | null
  planPeriod: "month" | "annual" | null
  /** When the subscription renews, or ends if it was canceled (ms). */
  renewsAt: number | null
  endsAt: number | null
  /** The current month of AI usage (ms): a month from the period start, every month. */
  usageWindow: { start: number; end: number } | null
}

/** Adds calendar months, keeping the day (clamped to the month's last day). */
export function addMonths(time: number, months: number) {
  const date = new Date(time)
  const day = date.getUTCDate()
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + months)
  const last = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)
  ).getUTCDate()
  date.setUTCDate(Math.min(day, last))
  return date.getTime()
}

/**
 * The month of usage a time falls in, counted from when the subscription's
 * period started, so annual plans get a fresh allowance every month too.
 */
export function usageWindowAt(periodStart: number, now: number) {
  let months = 0
  while (addMonths(periodStart, months + 1) <= now) months++
  return {
    start: addMonths(periodStart, months),
    end: addMonths(periodStart, months + 1),
  }
}

/** Asks Clerk Billing whether the user has a plan (CLERK_AWMA_PLAN_ID). */
async function checkClerk(userId: string, now: number): Promise<Entitlement> {
  const inactive: Entitlement = {
    active: false,
    plan: null,
    planPeriod: null,
    renewsAt: null,
    endsAt: null,
    usageWindow: null,
  }
  const planIds = new Map<string, DawPlanKey>()
  for (const id of legacyPlanIds()) planIds.set(id, "awma")
  for (const plan of dawPlans) {
    const id = dawPlanId(plan.key)
    if (id) planIds.set(id, plan.key)
  }
  if (planIds.size === 0) return inactive

  const client = await clerkClient()
  let subscription
  try {
    subscription = await client.billing.getUserBillingSubscription(userId)
  } catch {
    // No subscription at all.
    return inactive
  }

  const items = subscription.subscriptionItems.filter((candidate) => {
    if (!candidate.planId || !planIds.has(candidate.planId)) return false
    const status = String(candidate.status)
    // Canceled subscriptions run to the end of what was paid for.
    return (
      status === "active" ||
      (status === "canceled" &&
        candidate.periodEnd !== null &&
        candidate.periodEnd > now)
    )
  })
  // While switching plans both can be current; the larger one counts.
  const rank = (key: DawPlanKey) =>
    dawPlans.findIndex((plan) => plan.key === key)
  const item = items.sort(
    (a, b) => rank(planIds.get(b.planId!)!) - rank(planIds.get(a.planId!)!)
  )[0]
  if (!item) return inactive

  const canceled = item.canceledAt !== null
  return {
    active: true,
    plan: planIds.get(item.planId!)!,
    planPeriod: item.planPeriod,
    renewsAt: canceled ? null : item.periodEnd,
    endsAt: canceled ? item.periodEnd : null,
    usageWindow: usageWindowAt(item.periodStart, now),
  }
}

/** The user's DAW license, if they have one (bought once, kept for good). */
export async function getLicense(userId: string) {
  return await convexQuery(api.licenses.get, { userId })
}

/** The user's subscription, cached for a few minutes. */
export async function getEntitlement(userId: string): Promise<Entitlement> {
  const now = Date.now()
  const cached = await convexQuery(api.entitlements.get, { userId })
  // Rows cached before the current plans (or without a plan) are checked again.
  const plan = cached?.plan
  if (
    cached &&
    (plan === null || dawPlans.some((known) => known.key === plan)) &&
    (!cached.usageWindow || cached.usageWindow.end > now)
  )
    return { ...cached, plan: plan as DawPlanKey | null }
  const entitlement = await checkClerk(userId, now)
  await convexMutation(api.entitlements.set, {
    userId,
    entitlement,
    ttl: CACHE_MS,
  })
  return entitlement
}
