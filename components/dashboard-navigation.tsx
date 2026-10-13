"use client"

import Link from "next/link"
import { LayoutGrid, CreditCard, Library, Store, UserRound } from "lucide-react"
import { dashboardSections, type DashboardSection } from "@/lib/dashboard"

const items = {
  overview: { label: "Overview", Icon: LayoutGrid },
  subscription: { label: "Subscription", Icon: CreditCard },
  library: { label: "Library", Icon: Library },
  seller: { label: "Seller studio", Icon: Store },
  profile: { label: "Profile & security", Icon: UserRound },
}
export function DashboardNavigation({
  section,
  onNavigate,
}: {
  section: DashboardSection
  onNavigate: () => void
}) {
  return (
    <nav aria-label="Dashboard sections">
      <span
        className="dashboard-sidebar-indicator"
        aria-hidden="true"
        style={{
          transform: `translateY(calc(${dashboardSections.indexOf(section)} * var(--sidebar-step)))`,
        }}
      />
      {dashboardSections.map((item) => {
        const { label, Icon } = items[item]
        return (
          <Link
            key={item}
            href={`/dashboard?section=${item}`}
            title={label}
            aria-label={label}
            aria-current={section === item ? "page" : undefined}
            onClick={onNavigate}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
