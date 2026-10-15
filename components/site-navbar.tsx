import { auth } from "@clerk/nextjs/server"
import { FloatingNavbar } from "@/components/floating-navbar"

export async function SiteNavbar() {
  const { userId } = await auth()
  return <FloatingNavbar initiallySignedIn={Boolean(userId)} />
}
