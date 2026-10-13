"use client"

import { CheckoutButton } from "@clerk/nextjs/experimental"

export function SubscriptionOptions({ planId }: { planId: string | null }) {
  const options = [
    {
      period: "month" as const,
      title: "Monthly",
      price: "$20",
      suffix: "/ month",
      note: "Billed monthly.",
    },
    {
      period: "annual" as const,
      title: "Yearly",
      price: "$200",
      suffix: "/ year",
      note: "Save $40 a year compared with monthly billing.",
    },
  ]
  return (
    <section
      className="subscription-section"
      aria-labelledby="subscription-title"
    >
      <h2 id="subscription-title">Amarula subscription</h2>
      <p className="dashboard-muted">
        The subscription covers the DAW and AI usage with Awma. There is no free
        DAW tier.
      </p>
      <div className="subscription-options">
        {options.map((option) => (
          <article className="subscription-option" key={option.period}>
            <h3>{option.title}</h3>
            <p className="subscription-price">
              {option.price}
              <span>{option.suffix}</span>
            </p>
            <p>{option.note}</p>
            {planId ? (
              <CheckoutButton
                for="user"
                planId={planId}
                planPeriod={option.period}
                newSubscriptionRedirectUrl="/dashboard?section=subscription"
              >
                <button className="waitlist-button" type="button">
                  Choose {option.title.toLowerCase()}
                </button>
              </CheckoutButton>
            ) : (
              <button className="waitlist-button" disabled>
                Subscriptions coming soon
              </button>
            )}
          </article>
        ))}
      </div>
      {!planId && (
        <p className="dashboard-muted">
          Checkout isn’t available yet. You won’t be charged during this
          preview.
        </p>
      )}
    </section>
  )
}
