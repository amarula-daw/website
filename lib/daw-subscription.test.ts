import { it } from "node:test"
import assert from "node:assert/strict"
import { matchesDawPlan } from "./daw-subscription"
import { dashboardSection } from "./dashboard"

const plan = {
  hasBaseFee: true,
  isRecurring: true,
  forPayerType: "user",
  freeTrialEnabled: false,
  fee: { amount: 2000, currency: "USD" },
  annualFee: { amount: 20000, currency: "USD" },
}
it("checkout accepts only the agreed paid subscription prices", () => {
  assert.equal(matchesDawPlan(plan), true)
  assert.equal(
    matchesDawPlan({ ...plan, annualFee: { amount: 10000, currency: "USD" } }),
    false
  )
  assert.equal(matchesDawPlan({ ...plan, hasBaseFee: false }), false)
  assert.equal(matchesDawPlan({ ...plan, freeTrialEnabled: true }), false)
  assert.equal(
    matchesDawPlan({ ...plan, fee: { amount: 2000, currency: "EUR" } }),
    false
  )
})
it("unknown dashboard sections fall back to the overview", () => {
  assert.equal(dashboardSection("seller"), "seller")
  assert.equal(dashboardSection(["profile", "seller"]), "overview")
  assert.equal(dashboardSection("not-a-section"), "overview")
})
