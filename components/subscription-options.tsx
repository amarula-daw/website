"use client"

import { CheckoutButton } from "@clerk/nextjs/experimental"

import {
  awmaPack,
  dawLicense,
  dawPlans,
  type DawPlanKey,
} from "@/lib/daw-subscription"

const dollars = (cents: number) => `$${cents / 100}`

/** A form that starts Stripe Checkout for a one-time purchase (app/api/checkout). */
function BuyButton({
  product,
  label,
  available,
}: {
  product: "license" | "awmaPack"
  label: string
  available: boolean
}) {
  if (!available)
    return (
      <button className="waitlist-button" disabled>
        Coming soon
      </button>
    )
  return (
    <form action="/api/checkout" method="post">
      <input type="hidden" name="product" value={product} />
      <button className="waitlist-button" type="submit">
        {label}
      </button>
    </form>
  )
}

export function SubscriptionOptions({
  planIds,
  licensed,
  subscribed,
  canBuyLicense,
  canBuyPack,
}: {
  /** Verified Clerk plan IDs; a plan without one can't be bought yet. */
  planIds: Partial<Record<DawPlanKey, string>>
  licensed: boolean
  subscribed: boolean
  canBuyLicense: boolean
  canBuyPack: boolean
}) {
  const available = canBuyLicense || dawPlans.some((plan) => planIds[plan.key])
  return (
    <section
      className="subscription-section"
      aria-labelledby="subscription-title"
    >
      <h2 id="subscription-title">Amarula pricing</h2>
      <p className="dashboard-muted">
        Try the whole DAW for free: the trial makes and saves projects, and a
        license reopens them. Awma, the cloud and its online features come with
        the subscription; beat battles are free.
      </p>
      <div className="subscription-options">
        <article className="subscription-option">
          <h3>{dawLicense.name}</h3>
          <p className="subscription-price">
            {dollars(dawLicense.priceCents)}
            <span>once</span>
          </p>
          <p>
            The DAW for good, with free updates through 1.x. It works offline.
          </p>
          {licensed ? (
            <p>
              <strong>You own Amarula.</strong>
            </p>
          ) : (
            <BuyButton
              product="license"
              label="Buy Amarula"
              available={canBuyLicense}
            />
          )}
        </article>
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
                {dollars(plan.awmaBudgetMicros / 10_000)} of Awma usage a month,
                then a lighter Awma until it resets.
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
        <article className="subscription-option">
          <h3>{awmaPack.name}</h3>
          <p className="subscription-price">
            {dollars(awmaPack.priceCents)}
            <span>once</span>
          </p>
          <p>
            {dollars(awmaPack.awmaMicros / 10_000)} more of Awma usage, used
            after the month&apos;s allowance. It doesn&apos;t expire.
          </p>
          {subscribed ? (
            <BuyButton
              product="awmaPack"
              label="Buy a pack"
              available={canBuyPack}
            />
          ) : (
            <p className="dashboard-muted">For Awma + Cloud subscribers.</p>
          )}
        </article>
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
