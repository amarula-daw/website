import { auth } from "@clerk/nextjs/server"
import { AccountDashboard } from "@/components/account-dashboard"
import { dashboardSection } from "@/lib/dashboard"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { userId } = await auth.protect()
  const search = await searchParams
  return (
    <AccountDashboard
      userId={userId}
      section={dashboardSection(search.section)}
    />
  )
}
