import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { LandingHero } from "@/components/landing-hero"
import { StickyFooter } from "@/components/sticky-footer"

export default async function Page() {
  const { userId } = await auth()
  if (userId) redirect("/dashboard")

  return (
    <>
      <LandingHero />
      <StickyFooter />
    </>
  )
}
