import { auth } from "@clerk/nextjs/server"

import { api } from "@/convex/_generated/api"
import { awmaMode, toLite, type AwmaMode } from "@/lib/awma/mode"
import { costMicros, PRICES, type Usage } from "@/lib/awma/pricing"
import { getEntitlement, type Entitlement } from "@/lib/desktop/entitlement"
import { convexMutation, convexQuery } from "@/lib/desktop/convex"
import { getDawPlan } from "@/lib/daw-subscription"

/*
 * Awma's requests to Claude, through the website: the desktop app's Awma
 * points the Claude Agent SDK here (ANTHROPIC_BASE_URL) with the user's
 * Clerk OAuth access token, and this forwards to Anthropic with the
 * server's own key. Nothing reaches Anthropic unless the user has the
 * subscription and is within its limits: the month's allowance, then their
 * Awma packs, then lite mode (a lighter model, up to a cap).
 */

/** The largest response one request may ask for. */
const MAX_OUTPUT_TOKENS = 32_000
/** The largest request body accepted. */
const MAX_BODY_BYTES = 4 * 1024 * 1024
const ANTHROPIC_URL = "https://api.anthropic.com"

type Limited = { error: Response }
type Allowed = {
  userId: string
  entitlement: Entitlement & {
    plan: NonNullable<Entitlement["plan"]>
    usageWindow: { start: number; end: number }
  }
  mode: AwmaMode
}

/** An error in the Messages API's own shape, so Claude Code shows the message. */
export function apiError(status: number, type: string, message: string) {
  return Response.json(
    { type: "error", error: { type, message } },
    { status, headers: status === 429 ? { "retry-after": "20" } : {} }
  )
}

/** Where the user stands this month: spent, spent in lite mode, and packs left (micro-dollars). */
export async function getStanding(userId: string, windowStart: number) {
  return await convexQuery(api.awma.standing, { userId, windowStart })
}

async function charge(allowed: Allowed, micros: number, lite: boolean) {
  if (micros <= 0) return
  await convexMutation(api.awma.charge, {
    userId: allowed.userId,
    window: allowed.entitlement.usageWindow,
    budgetMicros: getDawPlan(allowed.entitlement.plan).awmaBudgetMicros,
    micros,
    lite,
  })
}

const formatDate = (time: number) =>
  new Date(time).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  })

/** The signed-in, subscribed user, if they may make a request now. */
export async function authorize(
  checkBudget: boolean
): Promise<Allowed | Limited> {
  const session = await auth({ acceptsToken: "oauth_token" })
  if (!session.isAuthenticated)
    return {
      error: apiError(
        401,
        "authentication_error",
        "Sign in to Amarula again to use Awma."
      ),
    }

  const { userId } = session
  const entitlement = await getEntitlement(userId)
  if (!entitlement.active || !entitlement.plan || !entitlement.usageWindow)
    return {
      error: apiError(
        403,
        "permission_error",
        "Awma needs an Awma + Cloud subscription. You can subscribe on the Amarula website."
      ),
    }

  if (!(await convexMutation(api.awma.limit, { userId })))
    return {
      error: apiError(
        429,
        "rate_limit_error",
        "Awma is getting a lot of requests from your account; it will continue in a moment."
      ),
    }

  let mode: AwmaMode = "included"
  if (checkBudget) {
    const standing = await getStanding(userId, entitlement.usageWindow.start)
    mode = awmaMode(standing, getDawPlan(entitlement.plan).awmaBudgetMicros)
    if (mode === "paused")
      // Not a 429: Claude Code would keep retrying.
      return {
        error: apiError(
          400,
          "invalid_request_error",
          `You've used this month's Awma, lite mode included. Buy an Awma pack on the Amarula website to carry on, or wait until it resets on ${formatDate(entitlement.usageWindow.end)}.`
        ),
      }
  }

  return { userId, entitlement: entitlement as Allowed["entitlement"], mode }
}

/** Counts a request as running; returns how to release it, or null if too many are. */
async function startRequest(userId: string) {
  const id = await convexMutation(api.awma.startRequest, { userId })
  if (!id) return null
  let released = false
  return async () => {
    if (released) return
    released = true
    await convexMutation(api.awma.endRequest, { id })
  }
}

/** Reads and checks the request body: an allowed model, a capped response, and a sane size. */
async function readBody(request: Request) {
  const text = await request.text()
  if (text.length > MAX_BODY_BYTES)
    return {
      error: apiError(413, "request_too_large", "The request is too large."),
    }
  let body: Record<string, unknown>
  try {
    body = JSON.parse(text)
  } catch {
    return { error: apiError(400, "invalid_request_error", "Invalid JSON.") }
  }
  const model = String(body.model ?? "")
  if (!(model in PRICES))
    return {
      error: apiError(
        400,
        "invalid_request_error",
        `Awma can't use the model ${model}.`
      ),
    }
  if (typeof body.max_tokens === "number")
    body.max_tokens = Math.min(body.max_tokens, MAX_OUTPUT_TOKENS)
  return { body, model }
}

/** Headers for Anthropic: the server's key, and the client's API version and betas. */
function anthropicHeaders(request: Request) {
  const headers = new Headers({
    "content-type": "application/json",
    "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
    "anthropic-version":
      request.headers.get("anthropic-version") ?? "2023-06-01",
  })
  const beta = request.headers.get("anthropic-beta")
  if (beta) headers.set("anthropic-beta", beta)
  return headers
}

/**
 * Passes a streamed response through, adding up its usage from the
 * server-sent events (message_start carries the input, message_delta the
 * cumulative output). Counts once, when it ends or when the app stops
 * reading (e.g. the chat was reset), so a cut-off reply is still charged.
 */
export function meterStream(
  body: ReadableStream<Uint8Array>,
  onDone: (usage: Usage) => Promise<void>
) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  const usage: Usage = {}
  let buffer = ""
  let finished = false

  const read = (line: string) => {
    if (!line.startsWith("data:")) return
    try {
      const event = JSON.parse(line.slice(5))
      const reported: Usage | undefined =
        event.type === "message_start" ? event.message?.usage : event.usage
      if (!reported) return
      for (const [key, value] of Object.entries(reported))
        if (value !== null && value !== undefined)
          (usage as Record<string, unknown>)[key] = value
    } catch {
      // Not JSON (e.g. a ping); nothing to count.
    }
  }
  const finish = async () => {
    if (finished) return
    finished = true
    read(buffer)
    await onDone(usage)
  }

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await reader.read()
        if (done) {
          await finish()
          controller.close()
          return
        }
        controller.enqueue(value)
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""
        lines.forEach(read)
      } catch (error) {
        await finish()
        controller.error(error)
      }
    },
    async cancel(reason) {
      await reader.cancel(reason)
      await finish()
    },
  })
}

/** POST /api/awma/v1/messages: a metered, limited request to Claude. */
export async function proxyMessages(request: Request) {
  const allowed = await authorize(true)
  if ("error" in allowed) return allowed.error
  const parsed = await readBody(request)
  if ("error" in parsed) return parsed.error
  // Lite mode runs Awma's own requests on the lighter model; Claude Code's
  // background calls already use it.
  const lite = allowed.mode === "lite"
  const body = lite ? toLite(parsed.body) : parsed.body
  const model = String(body.model)

  const release = await startRequest(allowed.userId)
  if (!release)
    return apiError(
      429,
      "rate_limit_error",
      "Awma is already working on two requests for your account."
    )

  try {
    const search = new URL(request.url).search
    const upstream = await fetch(`${ANTHROPIC_URL}/v1/messages${search}`, {
      method: "POST",
      headers: anthropicHeaders(request),
      body: JSON.stringify(body),
      signal: request.signal,
    })

    const headers = new Headers()
    for (const name of ["content-type", "request-id", "retry-after"]) {
      const value = upstream.headers.get(name)
      if (value) headers.set(name, value)
    }

    const settle = async (usage: Usage) => {
      try {
        await charge(allowed, costMicros(model, usage), lite)
      } finally {
        await release()
      }
    }

    if (!upstream.ok || !upstream.body) {
      await release()
      // Anthropic's own errors pass through (they're already in this shape),
      // except authentication, which is the server's key and not the user's.
      if (upstream.status === 401 || upstream.status === 403)
        return apiError(
          502,
          "api_error",
          "Awma's service is unavailable right now."
        )
      return new Response(upstream.body, { status: upstream.status, headers })
    }

    if (body.stream === true)
      return new Response(meterStream(upstream.body, settle), {
        status: upstream.status,
        headers,
      })

    const message = await upstream.json()
    await settle(message.usage ?? {})
    return Response.json(message, { status: upstream.status, headers })
  } catch (error) {
    await release()
    if (request.signal.aborted) return new Response(null, { status: 499 })
    console.error("Awma proxy failed", error)
    return apiError(502, "api_error", "Awma couldn't reach Claude. Try again.")
  }
}

/** POST /api/awma/v1/messages/count_tokens: free, but still for subscribers only. */
export async function proxyCountTokens(request: Request) {
  const allowed = await authorize(false)
  if ("error" in allowed) return allowed.error
  const parsed = await readBody(request)
  if ("error" in parsed) return parsed.error
  const search = new URL(request.url).search
  const upstream = await fetch(
    `${ANTHROPIC_URL}/v1/messages/count_tokens${search}`,
    {
      method: "POST",
      headers: anthropicHeaders(request),
      body: JSON.stringify(parsed.body),
    }
  )
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "content-type": "application/json" },
  })
}
