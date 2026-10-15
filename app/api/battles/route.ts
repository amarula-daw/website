import { api } from "@/convex/_generated/api"
import { battleLengths } from "@/convex/battleRules"
import {
  asPlayer,
  battleResponse,
  displayName,
  error,
  jsonBody,
  noStore,
} from "@/lib/battles/api"
import { convexMutation, convexQuery } from "@/lib/desktop/convex"

/** GET /api/battles: the invite code of the battle the user is still in, or null. */
export async function GET() {
  return asPlayer(async (userId) => {
    const code = await convexQuery(api.battles.current, { userId })
    return Response.json({ code }, { headers: noStore })
  })
}

/**
 * POST /api/battles { minutes, awma }: opens a lobby with the user as host
 * (leaving any battle they were in) and returns it, invite code included.
 */
export async function POST(request: Request) {
  const body = await jsonBody(request)
  const minutes = battleLengths.find((length) => length === body.minutes)
  if (!minutes)
    return error(400, `'minutes' must be one of ${battleLengths.join(", ")}`)
  if (typeof body.awma !== "boolean")
    return error(400, "'awma' must be true or false")
  const awma = body.awma

  return asPlayer(async (userId) => {
    const code = await convexMutation(api.battles.create, {
      userId,
      name: await displayName(userId),
      minutes,
      awma,
    })
    return battleResponse(userId, code)
  })
}
