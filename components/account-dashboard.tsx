import Link from "next/link"
import { cookies } from "next/headers"
import { AccountSettings } from "@/components/account-settings"
import { DashboardChrome } from "@/components/dashboard-chrome"
import { clerkClient } from "@clerk/nextjs/server"
import { SubscriptionOptions } from "@/components/subscription-options"
import { SellerStudio } from "@/components/marketplace/seller-studio"
import { type DashboardSection } from "@/lib/dashboard"
import {
  dawPlanId,
  dawPlans,
  matchesDawPlan,
  type DawPlanKey,
} from "@/lib/daw-subscription"

const labels = {
  overview: "Overview",
  subscription: "Subscription",
  library: "Library",
  seller: "Seller studio",
  profile: "Profile & security",
}

export async function AccountDashboard({
  userId,
  section = "overview",
}: {
  userId: string
  section?: DashboardSection
}) {
  const preferenceCookie = `amarula-sidebar-${userId}`
  const initiallyExpanded =
    (await cookies()).get(preferenceCookie)?.value !== "collapsed"
  const planIds: Partial<Record<DawPlanKey, string>> = {}
  if (
    (section === "overview" || section === "subscription") &&
    process.env.CLERK_BILLING_ENABLED === "true" &&
    dawPlans.some((plan) => dawPlanId(plan.key))
  ) {
    try {
      const client = await clerkClient()
      const plans = await client.billing.getPlanList({
        payerType: "user",
        limit: 100,
      })
      for (const dawPlan of dawPlans) {
        const plan = plans.data.find(
          (item) => item.id === dawPlanId(dawPlan.key)
        )
        if (plan && matchesDawPlan(plan, dawPlan))
          planIds[dawPlan.key] = plan.id
      }
    } catch {
      /* Keep checkout unavailable when its price cannot be verified. */
    }
  }
  return (
    <main className="dashboard-shell">
      <DashboardChrome
        title={labels[section]}
        section={section}
        initiallyExpanded={initiallyExpanded}
        preferenceCookie={preferenceCookie}
      >
        <div className="dashboard-content" key={section}>
          <header className="dashboard-heading">
            <h1>{section === "overview" ? "Dashboard" : labels[section]}</h1>
            <p className="dashboard-muted">
              Your Amarula account, tools, and purchases.
            </p>
          </header>
          {section === "overview" && (
            <>
              <div className="dashboard-summary-grid">
                <article>
                  <span>Amarula</span>
                  <strong>Closed Alpha</strong>
                  <p>Early access testing</p>
                </article>
                <article>
                  <span>Awma</span>
                  <strong>Included</strong>
                  <p>AI usage covered by your DAW subscription</p>
                </article>
                <article>
                  <span>Marketplace</span>
                  <strong>Preview</strong>
                  <p>Plugins, kits, and presets</p>
                </article>
              </div>
              <SubscriptionOptions planIds={planIds} />
              <div className="dashboard-overview-links">
                <Link href="/dashboard?section=library">
                  <h2>Your library</h2>
                  <p>Find your plugins, kits, and presets.</p>
                  <span>Open library</span>
                </Link>
                <Link href="/dashboard?section=seller">
                  <h2>Seller studio</h2>
                  <p>Prepare listings for the marketplace.</p>
                  <span>Open seller studio</span>
                </Link>
              </div>
            </>
          )}
          {section === "subscription" && (
            <SubscriptionOptions planIds={planIds} />
          )}
          {section === "library" && (
            <section className="dashboard-library">
              <h2>Your library is empty</h2>
              <p>
                Purchased plugins, kits, and presets will appear here when the
                marketplace opens. Direct downloads into Amarula are still in
                development.
              </p>
            </section>
          )}
          {section === "seller" && <SellerStudio userId={userId} />}
          {section === "profile" && <AccountSettings />}
        </div>
      </DashboardChrome>
    </main>
  )
}
