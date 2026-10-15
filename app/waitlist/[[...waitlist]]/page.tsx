import { Waitlist } from "@clerk/nextjs"
import { AccountShell } from "@/components/account-shell"

export default function WaitlistPage() {
  return (
    <AccountShell>
      <Waitlist />
    </AccountShell>
  )
}
