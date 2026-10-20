import { api } from "@/convex/_generated/api"
import { parseBatch } from "@/lib/desktop/analytics"
import { convexMutation } from "@/lib/desktop/convex"

/** Largest body taken: a full batch with room to spare. */
const MAX_BYTES = 512 * 1024

/**
 * POST /api/desktop/analytics: a batch of the desktop app's anonymous,
 * opt-in usage analytics (docs/analytics.md). No sign-in: batches carry a
 * random install id, never the account.
 */
export async function POST(request: Request) {
  const text = await request.text()
  if (text.length > MAX_BYTES)
    return Response.json({ error: "Too large" }, { status: 413 })

  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return Response.json({ error: "Expected JSON" }, { status: 400 })
  }

  const batch = parseBatch(body)
  if ("error" in batch)
    return Response.json({ error: batch.error }, { status: 400 })

  const stored = await convexMutation(api.analytics.record, batch)
  if (!stored)
    return Response.json({ error: "Too many batches" }, { status: 429 })
  return new Response(null, { status: 204 })
}
