import { api } from "@/convex/_generated/api"
import { convexQuery } from "@/lib/desktop/convex"

/** GET /api/battles/leaderboard: the top beat battle players by points. */
export async function GET() {
  const players = await convexQuery(api.battles.leaderboard, { limit: 50 })
  return Response.json(
    { players },
    { headers: { "cache-control": "public, max-age=60" } }
  )
}
