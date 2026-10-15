import { SignUp } from "@clerk/nextjs"
import { redirect } from "next/navigation"
import { AccountShell } from "@/components/account-shell"

export default async function SignUpPage({
  params,
  searchParams,
}: {
  params: Promise<{ "sign-up"?: string[] }>
  searchParams: Promise<{ __clerk_ticket?: string | string[] }>
}) {
  const [path, query] = await Promise.all([params, searchParams])

  // Approved testers arrive with an invitation ticket. Public visitors join the waitlist.
  if (!path["sign-up"]?.length && !query.__clerk_ticket) {
    redirect("/waitlist")
  }

  return (
    <AccountShell>
      <SignUp />
    </AccountShell>
  )
}
