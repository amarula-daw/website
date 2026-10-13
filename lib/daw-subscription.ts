export const dawPrice = {
  monthlyCents: 2000,
  annualCents: 20000,
  currency: "USD",
} as const

export function matchesDawPlan(plan: {
  hasBaseFee: boolean
  isRecurring: boolean
  forPayerType: string
  freeTrialEnabled: boolean
  fee: { amount: number; currency: string } | null
  annualFee: { amount: number; currency: string } | null
}) {
  return (
    plan.hasBaseFee &&
    plan.isRecurring &&
    plan.forPayerType === "user" &&
    !plan.freeTrialEnabled &&
    plan.fee?.amount === dawPrice.monthlyCents &&
    plan.fee.currency === dawPrice.currency &&
    plan.annualFee?.amount === dawPrice.annualCents &&
    plan.annualFee.currency === dawPrice.currency
  )
}
