/*
 * What Awma's requests cost, in micro-dollars (millionths of a dollar), from
 * the usage Anthropic reports. Prices are Anthropic's first-party rates per
 * million tokens (October 2026); cache writes cost 1.25× input for the
 * 5-minute cache and 2× for the 1-hour cache.
 */

type Price = { input: number; output: number; cacheRead: number }

/** Dollars per million tokens. Only these models are allowed through the proxy. */
export const PRICES: Record<string, Price> = {
  // Awma's own model; keep in sync with AWMA_MODEL in the desktop app's
  // apps/agent/src/session.ts.
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2 },
  // Claude Code's quick background calls (titles, summaries).
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01 },
}

/** Usage as the Messages API reports it (the fields Awma's cost needs). */
export type Usage = {
  input_tokens?: number | null
  output_tokens?: number | null
  cache_read_input_tokens?: number | null
  cache_creation_input_tokens?: number | null
  cache_creation?: {
    ephemeral_5m_input_tokens?: number | null
    ephemeral_1h_input_tokens?: number | null
  } | null
}

/**
 * The cost of one response, in micro-dollars, rounded up. Haiku's prices
 * are five times as much past 100K input tokens; Sonnet's are flat.
 */
export function costMicros(model: string, usage: Usage) {
  const price = PRICES[model]
  if (!price) return 0
  const input = usage.input_tokens ?? 0
  const cacheRead = usage.cache_read_input_tokens ?? 0
  const oneHour = usage.cache_creation?.ephemeral_1h_input_tokens ?? 0
  const fiveMinutes =
    usage.cache_creation?.ephemeral_5m_input_tokens ??
    Math.max(0, (usage.cache_creation_input_tokens ?? 0) - oneHour)
  const output = usage.output_tokens ?? 0
  const longPrompt =
    model === "claude-haiku-5-5" &&
    input + cacheRead + fiveMinutes + oneHour > 100_000
  const scale = longPrompt ? 5 : 1

  // Dollars per million tokens is micro-dollars per token.
  const micros =
    scale *
    (input * price.input +
      fiveMinutes * price.input * 1.25 +
      oneHour * price.input * 2 +
      cacheRead * price.cacheRead +
      output * price.output)
  return Math.ceil(micros)
}
