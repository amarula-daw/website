/**
 * How Awma runs for a subscriber right now: on the month's allowance, on
 * their packs once it's used, or paused until the month resets once those
 * are used too.
 */
export type AwmaMode = "included" | "credits" | "paused"

export type AwmaStanding = { micros: number; creditMicros: number }

/**
 * Packs with less than this left (5¢) don't start a request, so one can't
 * run far past them; what's left carries over to the next pack.
 */
export const MIN_CREDIT_MICROS = 50_000

export function awmaMode(
  standing: AwmaStanding,
  budgetMicros: number
): AwmaMode {
  if (standing.micros < budgetMicros) return "included"
  if (standing.creditMicros >= MIN_CREDIT_MICROS) return "credits"
  return "paused"
}
