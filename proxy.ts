import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

/*
 * Until early access opens, signed-out visitors see only the landing page and
 * what it links to: the waitlist, signing in (and invitation sign-ups), and
 * the legal pages. Accounts exist only for testers accepted from the
 * waitlist, so signing in unlocks the rest. API routes check their own auth
 * (the desktop app's OAuth tokens, and its marketplace).
 */
const isPublic = createRouteMatcher([
  "/",
  "/landing",
  "/waitlist(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/terms",
  "/privacy",
  "/api/(.*)",
])

export default clerkMiddleware(async (auth, request) => {
  if (isPublic(request)) return
  const { userId } = await auth()
  if (!userId) return NextResponse.redirect(new URL("/", request.url))
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
