export type DawPlanKey = "standard" | "extended"

export type DawPlan = {
  key: DawPlanKey
  name: string
  monthlyCents: number
  annualCents: number
  /** What the plan includes each month, in micro-dollars of Anthropic usage. */
  awmaBudgetMicros: number
}

export const dawCurrency = "USD"

/** The paid user plans, cheapest first. Both unlock the DAW; they differ in Awma's allowance. */
export const dawPlans: readonly DawPlan[] = [
  {
    key: "standard",
    name: "Standard",
    monthlyCents: 2000,
    annualCents: 20400,
    awmaBudgetMicros: 10_000_000,
  },
  {
    key: "extended",
    name: "Extended",
    monthlyCents: 5000,
    annualCents: 54000,
    awmaBudgetMicros: 40_000_000,
  },
]

export function getDawPlan(key: DawPlanKey) {
  return dawPlans.find((plan) => plan.key === key)!
}

/** The Clerk plan ID for a plan (CLERK_DAW_STANDARD_PLAN_ID, CLERK_DAW_EXTENDED_PLAN_ID). */
export function dawPlanId(key: DawPlanKey) {
  const id =
    key === "standard"
      ? process.env.CLERK_DAW_STANDARD_PLAN_ID
      : process.env.CLERK_DAW_EXTENDED_PLAN_ID
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
