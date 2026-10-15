import { SignIn } from "@clerk/nextjs"
import { AccountShell } from "@/components/account-shell"

export default function SignInPage() {
  return (
    <AccountShell>
      <SignIn />
    </AccountShell>
  )
}
