import { api } from "@/convex/_generated/api"
import {
  asPlayer,
  battleResponse,
  displayName,
  error,
  jsonBody,
  noStore,
} from "@/lib/battles/api"
import { normalizeCode } from "@/convex/battleRules"
import { convexMutation } from "@/lib/desktop/convex"

const actions = [
  "join",
  "leave",
  "start",
  "kit-vote",
  "upload-url",
  "submit",
  "vote",
] as const

/**
 * POST /api/battles/:code/:action: a player's move. Each returns the battle
 * as it is afterwards (like GET /api/battles/:code), except upload-url.
 *
 * - join, leave, start (host only)
 * - kit-vote { slug }: one of the kit options
 * - upload-url: where to POST the exported beat (with its Content-Type, MP3 or WAV)
 * - submit { storageId, fileName, usedAwma }: enters the upload, replacing an earlier one
 * - vote { submissionId, score }: 1 to 5, for someone else's beat
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string; action: string }> }
) {
  const { code: rawCode, action: rawAction } = await params
  const code = normalizeCode(rawCode)
  const action = actions.find((item) => item === rawAction)
  if (!code) return error(404, "That battle doesn't exist.")
  if (!action) return error(404, `Unknown battle action '${rawAction}'`)
  const body = await jsonBody(request)

  return asPlayer(async (userId) => {
    switch (action) {
      case "join":
        await convexMutation(api.battles.join, {
          userId,
          code,
          name: await displayName(userId),
        })
        break
      case "leave":
        await convexMutation(api.battles.leaveBattle, { userId, code })
        break
      case "start":
        await convexMutation(api.battles.start, { userId, code })
        break
      case "kit-vote":
        if (typeof body.slug !== "string")
          return error(400, "'slug' must be a kit's slug")
        await convexMutation(api.battles.voteKit, {
          userId,
          code,
          slug: body.slug,
        })
        break
      case "upload-url": {
        const url = await convexMutation(api.battles.generateUploadUrl, {
          userId,
          code,
        })
        return Response.json({ url }, { headers: noStore })
      }
      case "submit": {
        const { storageId, fileName, usedAwma } = body
        if (
          typeof storageId !== "string" ||
          typeof fileName !== "string" ||
          typeof usedAwma !== "boolean"
        )
          return error(
            400,
            "'storageId' and 'fileName' must be strings and 'usedAwma' true or false"
          )
        const result = await convexMutation(api.battles.submit, {
          userId,
          code,
          storageId,
          fileName,
          usedAwma,
        })
        if (result.error) return error(400, result.error)
        break
      }
      case "vote": {
        const { submissionId, score } = body
        if (typeof submissionId !== "string" || typeof score !== "number")
          return error(
            400,
            "'submissionId' must be a string and 'score' a number"
          )
        await convexMutation(api.battles.vote, {
          userId,
          code,
          submissionId,
          score,
        })
        break
      }
    }
    return battleResponse(userId, code)
  })
}
