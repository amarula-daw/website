"use client"

import Link from "next/link"
import { useClerk } from "@clerk/nextjs"

export function WaitlistButton({ signedIn = false }: { signedIn?: boolean }) {
  const clerk = useClerk()

  return (
    <Link
      className="waitlist-button"
      href={signedIn ? "/dashboard" : "/waitlist"}
      onClick={(event) => {
        // The link remains usable before Clerk finishes loading.
        if (!signedIn && clerk.loaded) {
          event.preventDefault()
          clerk.openWaitlist()
        }
      }}
    >
      {signedIn ? "Go to dashboard" : "Join the waitlist"}
    </Link>
  )
}
