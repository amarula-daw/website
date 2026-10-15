import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export default async function AccountPage({
  params,
}: {
  params: Promise<{ account?: string[] }>
}) {
  await auth.protect()
  const { account } = await params
  redirect(
    `/dashboard?section=profile${account?.[0] === "security" ? "#security" : ""}`
  )
}
