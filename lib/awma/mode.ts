import { awmaLiteMicros } from "@/lib/daw-subscription"

/**
 * How Awma runs for a subscriber right now: on the month's allowance, on
 * their packs once it's used, in lite mode (a lighter model, up to a cap)
 * once those are used too, or paused until the month resets.
 */
export type AwmaMode = "included" | "credits" | "lite" | "paused"

export type AwmaStanding = {
  micros: number
  liteMicros: number
  creditMicros: number
}

/** Packs with less than this left don't start a full request (5¢); lite mode takes over. */
export const MIN_CREDIT_MICROS = 50_000

export function awmaMode(
  standing: AwmaStanding,
  budgetMicros: number
): AwmaMode {
  if (standing.micros < budgetMicros) return "included"
  if (standing.creditMicros >= MIN_CREDIT_MICROS) return "credits"
  if (standing.liteMicros < awmaLiteMicros) return "lite"
  return "paused"
}

/** Lite mode's model, cheaper and quicker than Awma's own. */
export const LITE_MODEL = "claude-haiku-5-5"

/**
 * A request for Awma's own model, rewritten for lite mode's: the model, and
 * Sonnet's `between_tools` thinking, which Haiku doesn't take, turned off
 * instead (Sonnet takes it only at high effort or below, where Haiku can
 * turn thinking off too).
 */
export function toLite(body: Record<string, unknown>) {
  const lite: Record<string, unknown> = { ...body, model: LITE_MODEL }
  const thinking = body.thinking as { type?: string } | undefined
  if (thinking?.type === "between_tools") lite.thinking = { type: "disabled" }
  return lite
}
