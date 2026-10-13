"use client"

import Link from "next/link"
import { House, Store, PanelsTopLeft, UserRound } from "lucide-react"
import { usePathname } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { ThemeToggleButton } from "@/components/theme-toggle-button"
import { WaitlistButton } from "@/components/waitlist-button"

export function FloatingNavbar({
  initiallySignedIn,
}: {
  initiallySignedIn: boolean
}) {
  const pathname = usePathname()
  const { isLoaded, isSignedIn } = useUser()
  const signedIn = isLoaded ? Boolean(isSignedIn) : initiallySignedIn
  const active = pathname.startsWith("/marketplace")
    ? 1
    : pathname === "/dashboard" ||
        pathname.startsWith("/sign-in") ||
        (pathname === "/" && signedIn)
      ? 2
      : pathname === "/landing" || pathname === "/"
        ? 0
        : -1
  const links = [
    { label: "Home", href: "/landing", Icon: House },
    { label: "Marketplace", href: "/marketplace", Icon: Store },
    {
      label: signedIn ? "Dashboard" : "Sign in",
      href: signedIn ? "/dashboard" : "/sign-in",
      Icon: PanelsTopLeft,
    },
  ]
  return (
    <header className="floating-navbar" data-signed-in={signedIn}>
      <Link className="floating-brand" href="/landing">
        Amarula
      </Link>
      <nav aria-label="Main navigation">
        <span
          className="navbar-tab-indicator"
          aria-hidden="true"
          style={{
            transform: `translateX(${Math.max(0, active) * 100}%)`,
            opacity: active < 0 ? 0 : 1,
          }}
        />
        {links.map(({ label, href, Icon }, index) => (
          <Link
            key={Icon.displayName || href}
            href={href}
            aria-label={label}
            title={label}
            aria-current={active === index ? "page" : undefined}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="floating-actions">
        <ThemeToggleButton />
        {signedIn ? (
          <Link
            className="navbar-account"
            aria-label="Account"
            title="Account"
            href="/dashboard?section=profile"
          >
            <UserRound aria-hidden="true" />
          </Link>
        ) : (
          <WaitlistButton />
        )}
      </div>
    </header>
  )
}
