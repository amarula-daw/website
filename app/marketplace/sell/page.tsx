import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
export default async function SellPage() {
  await auth.protect()
  redirect("/dashboard?section=seller")
}
