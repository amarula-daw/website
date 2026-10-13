import Link from "next/link"
import { cookies } from "next/headers"
import { AccountSettings } from "@/components/account-settings"
import { DashboardChrome } from "@/components/dashboard-chrome"
import { clerkClient } from "@clerk/nextjs/server"
import { SubscriptionOptions } from "@/components/subscription-options"
import { SellerStudio } from "@/components/marketplace/seller-studio"
import { type DashboardSection } from "@/lib/dashboard"
import { matchesDawPlan } from "@/lib/daw-subscription"

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
  let planId: string | null = null
  if (
    (section === "overview" || section === "subscription") &&
    process.env.CLERK_BILLING_ENABLED === "true" &&
    process.env.CLERK_DAW_PLAN_ID
  ) {
    try {
      const client = await clerkClient()
      const plans = await client.billing.getPlanList({
        payerType: "user",
        limit: 100,
      })
      const plan = plans.data.find(
        (item) => item.id === process.env.CLERK_DAW_PLAN_ID
      )
      if (plan && matchesDawPlan(plan)) planId = plan.id
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
              <SubscriptionOptions planId={planId} />
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
            <SubscriptionOptions planId={planId} />
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
