"use client"

import { useEffect, useState, type ReactNode } from "react"
import { PanelLeft, AudioLines, LogOut } from "lucide-react"
import Link from "next/link"
import { DashboardNavigation } from "@/components/dashboard-navigation"
import type { DashboardSection } from "@/lib/dashboard"
import { SignOutButton, useUser } from "@clerk/nextjs"

export function DashboardChrome({
  section,
  initiallyExpanded,
  preferenceCookie,
  title,
  children,
}: {
  section: DashboardSection
  initiallyExpanded: boolean
  preferenceCookie: string
  title: string
  children: ReactNode
}) {
  const [expanded, setExpanded] = useState(initiallyExpanded)
  const { user } = useUser()
  function changeExpanded(next: boolean) {
    setExpanded(next)
    document.cookie = `${preferenceCookie}=${next ? "expanded" : "collapsed"}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`
  }
  useEffect(() => {
    if (!expanded) return
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.key === "Escape" &&
        !event.defaultPrevented &&
        matchMedia("(max-width: 760px)").matches
      ) {
        event.preventDefault()
        setExpanded(false)
        document.cookie = `${preferenceCookie}=collapsed; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [expanded, preferenceCookie])
  return (
    <div className="dashboard-frame" data-expanded={expanded}>
      <button
        className="dashboard-sidebar-scrim"
        type="button"
        aria-label="Close navigation"
        onClick={() => changeExpanded(false)}
      />
      <aside className="dashboard-sidebar" id="workspace-sidebar">
        <Link
          className="dashboard-rail-brand"
          href="/dashboard"
          title="Amarula overview"
          aria-label="Amarula overview"
        >
          <AudioLines aria-hidden="true" />
          <span>Amarula</span>
        </Link>
        {
          <button
            className="dashboard-rail-collapse"
            type="button"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            onClick={() => changeExpanded(false)}
          >
            <PanelLeft aria-hidden="true" />
          </button>
        }
        <DashboardNavigation
          section={section}
          onNavigate={() => {
            if (matchMedia("(max-width: 760px)").matches) setExpanded(false)
          }}
        />
        <div className="dashboard-rail-account">
          <Link
            href="/dashboard?section=profile"
            aria-label="Account settings"
            title="Account settings"
          >
            <span className="account-avatar">
              {(
                user?.firstName ||
                user?.primaryEmailAddress?.emailAddress ||
                "A"
              )
                .slice(0, 1)
                .toUpperCase()}
            </span>
            <span className="rail-user-name">
              {user?.firstName || "Your account"}
            </span>
          </Link>
          <SignOutButton redirectUrl="/landing">
            <button type="button" title="Sign out" aria-label="Sign out">
              <LogOut aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </SignOutButton>
        </div>
      </aside>
      <div className="dashboard-main">
        <div className="dashboard-topbar">
          <button
            type="button"
            onClick={() => changeExpanded(!expanded)}
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={expanded}
            aria-controls="workspace-sidebar"
          >
            <PanelLeft aria-hidden="true" />
          </button>
          <span>{title}</span>
          <span className="dashboard-alpha-badge">Closed Alpha</span>
        </div>
        <div className="dashboard-scroll" key={title}>
          {children}
        </div>
      </div>
    </div>
  )
}
