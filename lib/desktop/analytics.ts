/*
 * The desktop app's analytics batches (docs/analytics.md), checked before
 * they're stored: known event names, and props that are only counts, ids and
 * timings (short strings, numbers, booleans).
 */

/** Keep in sync with AnalyticsEvent in the desktop app's packages/protocol and convex/schema.ts. */
export const EVENT_NAMES = [
  "app.launched",
  "app.crashed",
  "command.used",
  "action.used",
  "usage.summary",
] as const
export type EventName = (typeof EVENT_NAMES)[number]

export const MAX_EVENTS = 500
const MAX_PROPS = 16
const MAX_STRING = 128
/** Batches can wait offline; events older than this are refused. */
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000

type Prop = string | number | boolean
export type Batch = {
  installId: string
  app: { version: string; platform: string; os: string; arch: string }
  events: { name: EventName; at: number; props: Record<string, Prop> }[]
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const shortString = (value: unknown): value is string =>
  typeof value === "string" && value.length <= MAX_STRING

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** Convex field names: no leading $ or _. */
const PROP_KEY = /^[A-Za-z][A-Za-z0-9]{0,31}$/

/** The batch, or why it's refused. */
export function parseBatch(
  body: unknown,
  now = Date.now()
): Batch | { error: string } {
  if (!isObject(body)) return { error: "Expected a JSON object" }
  const { installId, app, events } = body
  if (typeof installId !== "string" || !UUID.test(installId))
    return { error: "installId must be a UUID" }
  if (
    !isObject(app) ||
    !(["version", "platform", "os", "arch"] as const).every((key) =>
      shortString(app[key])
    )
  )
    return { error: "app must have version, platform, os and arch" }
  if (!Array.isArray(events) || events.length > MAX_EVENTS)
    return { error: `events must be an array of at most ${MAX_EVENTS}` }

  const parsed: Batch["events"] = []
  for (const [index, event] of events.entries()) {
    const where = `events[${index}]`
    if (!isObject(event)) return { error: `${where} must be an object` }
    if (!EVENT_NAMES.includes(event.name as EventName))
      return { error: `${where}.name isn't a known event` }
    const at = typeof event.at === "string" ? Date.parse(event.at) : NaN
    if (
      !Number.isFinite(at) ||
      at > now + 60 * 60 * 1000 ||
      at < now - MAX_AGE_MS
    )
      return { error: `${where}.at must be a recent ISO 8601 time` }
    if (!isObject(event.props))
      return { error: `${where}.props must be an object` }
    const entries = Object.entries(event.props)
    if (entries.length > MAX_PROPS)
      return { error: `${where}.props has too many entries` }
    for (const [key, value] of entries) {
      const ok =
        PROP_KEY.test(key) &&
        (typeof value === "boolean" ||
          (typeof value === "number" && Number.isFinite(value)) ||
          shortString(value))
      if (!ok) return { error: `${where}.props.${key} isn't allowed` }
    }
    parsed.push({
      name: event.name as EventName,
      at,
      props: event.props as Record<string, Prop>,
    })
  }

  return {
    installId: installId.toLowerCase(),
    app: {
      version: app.version as string,
      platform: app.platform as string,
      os: app.os as string,
      arch: app.arch as string,
    },
    events: parsed,
  }
}
