import { it } from "node:test"
import assert from "node:assert/strict"
import { getDawPlan, matchesDawPlan } from "./daw-subscription"
import { dashboardSection } from "./dashboard"

const standard = getDawPlan("standard")
const extended = getDawPlan("extended")
const plan = {
  hasBaseFee: true,
  isRecurring: true,
  forPayerType: "user",
  freeTrialEnabled: false,
  fee: { amount: 2000, currency: "USD" },
  annualFee: { amount: 20400, currency: "USD" },
}
it("checkout accepts only the agreed paid subscription prices", () => {
  assert.equal(matchesDawPlan(plan, standard), true)
  assert.equal(matchesDawPlan(plan, extended), false)
  assert.equal(
    matchesDawPlan(
      {
        ...plan,
        fee: { amount: 5000, currency: "USD" },
        annualFee: { amount: 54000, currency: "USD" },
      },
      extended
    ),
    true
  )
  assert.equal(
    matchesDawPlan(
      { ...plan, annualFee: { amount: 10000, currency: "USD" } },
      standard
    ),
    false
  )
  assert.equal(matchesDawPlan({ ...plan, hasBaseFee: false }, standard), false)
  assert.equal(
    matchesDawPlan({ ...plan, freeTrialEnabled: true }, standard),
    false
  )
  assert.equal(
    matchesDawPlan(
      { ...plan, fee: { amount: 2000, currency: "EUR" } },
      standard
    ),
    false
  )
})
it("unknown dashboard sections fall back to the overview", () => {
  assert.equal(dashboardSection("seller"), "seller")
  assert.equal(dashboardSection(["profile", "seller"]), "overview")
  assert.equal(dashboardSection("not-a-section"), "overview")
})
