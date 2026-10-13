import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
export default async function SubscriptionPage() {
  await auth.protect()
  redirect("/dashboard?section=subscription")
}
