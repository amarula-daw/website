import { asPlayer, battleResponse, codeParam, error } from "@/lib/battles/api"

/**
 * GET /api/battles/:code: the battle as the player sees it, and the
 * server's time (serverTime, ms) to count down to its phaseEndsAt. The app
 * polls this while in a battle.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const code = await codeParam(params)
  if (!code) return error(404, "That battle doesn't exist.")
  return asPlayer((userId) => battleResponse(userId, code))
}
