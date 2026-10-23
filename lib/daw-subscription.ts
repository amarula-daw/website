/*
 * What Amarula costs: the DAW is a one-time license (a free trial without
 * it), and one subscription covers the online features, Awma and the cloud.
 * Awma packs top up a month's Awma once the subscription's allowance is used.
 */

export type DawPlanKey = "awma"

export type DawPlan = {
  key: DawPlanKey
  name: string
  monthlyCents: number
  annualCents: number
  /** What the plan includes each month, in micro-dollars of Anthropic usage. */
  awmaBudgetMicros: number
}

export const dawCurrency = "USD"

/** The subscription plans, cheapest first. */
export const dawPlans: readonly DawPlan[] = [
  {
    key: "awma",
    name: "Awma + Cloud",
    monthlyCents: 2000,
    annualCents: 20000,
    awmaBudgetMicros: 7_000_000,
  },
]

/** The DAW's lifetime license: paid once, kept for good, and it works offline. */
export const dawLicense = { name: "Amarula", priceCents: 9900 }

/**
 * An Awma pack: bought once, used only after the month's allowance runs
 * out, and kept until it's used up.
 */
export const awmaPack = {
  name: "Awma pack",
  priceCents: 1000,
  awmaMicros: 6_000_000,
}

export function getDawPlan(key: DawPlanKey) {
  return dawPlans.find((plan) => plan.key === key)!
}

/** The Clerk plan ID for a plan (CLERK_AWMA_PLAN_ID). */
export function dawPlanId(key: DawPlanKey) {
  const id = key === "awma" ? process.env.CLERK_AWMA_PLAN_ID : undefined
  return id || null
}

export function matchesDawPlan(
  plan: {
    hasBaseFee: boolean
    isRecurring: boolean
    forPayerType: string
    freeTrialEnabled: boolean
    fee: { amount: number; currency: string } | null
    annualFee: { amount: number; currency: string } | null
  },
  dawPlan: DawPlan
) {
  return (
    plan.hasBaseFee &&
    plan.isRecurring &&
    plan.forPayerType === "user" &&
    !plan.freeTrialEnabled &&
    plan.fee?.amount === dawPlan.monthlyCents &&
    plan.fee.currency === dawCurrency &&
    plan.annualFee?.amount === dawPlan.annualCents &&
    plan.annualFee.currency === dawCurrency
  )
}
