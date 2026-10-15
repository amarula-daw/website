import { auth } from "@clerk/nextjs/server"
import { ConvexError } from "convex/values"

import { api } from "@/convex/_generated/api"
import { convexMutation } from "@/lib/desktop/convex"
import { platforms } from "@/lib/marketplace/catalog"

/**
 * POST /api/marketplace/products/:slug/download { platform }: where the
 * desktop app downloads a free product, and the file's size and SHA-256 to
 * check it against. With the app's Clerk OAuth token (optional), the product
 * is added to the user's library.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const body: unknown = await request.json().catch(() => null)
  const platform =
    body && typeof body === "object" && "platform" in body
      ? platforms.find((item) => item === body.platform)
      : undefined
  if (!platform)
    return Response.json(
      { error: `'platform' must be one of ${platforms.join(", ")}` },
      { status: 400 }
    )

  const session = await auth({ acceptsToken: "oauth_token" })
  try {
    const download = await convexMutation(api.marketplace.download, {
      slug,
      platform,
      userId: session.isAuthenticated ? session.userId : null,
    })
    return Response.json(download, { headers: { "cache-control": "no-store" } })
  } catch (error) {
    if (error instanceof ConvexError && typeof error.data === "string")
      return Response.json({ error: error.data }, { status: 404 })
    throw error
  }
}
