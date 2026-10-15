"use client"

import { CheckoutButton } from "@clerk/nextjs/experimental"

import { dawPlans, type DawPlanKey } from "@/lib/daw-subscription"

const dollars = (cents: number) => `$${cents / 100}`

export function SubscriptionOptions({
  planIds,
}: {
  /** Verified Clerk plan IDs; a plan without one can't be bought yet. */
  planIds: Partial<Record<DawPlanKey, string>>
}) {
  const available = dawPlans.some((plan) => planIds[plan.key])
  return (
    <section
      className="subscription-section"
      aria-labelledby="subscription-title"
    >
      <h2 id="subscription-title">Amarula subscription</h2>
      <p className="dashboard-muted">
        Both plans cover the DAW and AI usage with Awma; Extended includes more
        Awma each month. There is no free DAW tier.
      </p>
      <div className="subscription-options">
        {dawPlans.map((plan) => {
          const planId = planIds[plan.key]
          const saving = plan.monthlyCents * 12 - plan.annualCents
          return (
            <article className="subscription-option" key={plan.key}>
              <h3>{plan.name}</h3>
              <p className="subscription-price">
                {dollars(plan.monthlyCents)}
                <span>/ month</span>
              </p>
              <p>
                Or {dollars(plan.annualCents)} a year
                {saving > 0 && <> (save {dollars(saving)})</>}. Includes up to{" "}
                {dollars(plan.awmaBudgetMicros / 10_000)} of Awma usage a month.
              </p>
              {planId ? (
                (["month", "annual"] as const).map((period) => (
                  <CheckoutButton
                    key={period}
                    for="user"
                    planId={planId}
                    planPeriod={period}
                    newSubscriptionRedirectUrl="/dashboard?section=subscription"
                  >
                    <button className="waitlist-button" type="button">
                      {period === "month" ? "Choose monthly" : "Choose yearly"}
                    </button>
                  </CheckoutButton>
                ))
              ) : (
                <button className="waitlist-button" disabled>
                  Subscriptions coming soon
                </button>
              )}
            </article>
          )
        })}
      </div>
      {!available && (
        <p className="dashboard-muted">
          Checkout isn’t available yet. You won’t be charged during this
          preview.
        </p>
      )}
    </section>
  )
}
