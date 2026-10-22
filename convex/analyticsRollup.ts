/*
 * How the desktop app's analytics are kept small enough for Convex's free
 * plan: each install's events are merged into one row a day (per app
 * version), with one entry per kind of event. Shared by convex/analytics.ts
 * and tested in lib/desktop/rollup.test.ts.
 */

type Prop = string | number | boolean

export type RollupEntry<Name extends string = string> = {
  name: Name
  /** The event's string and boolean props, which tell entries apart (e.g. which command). */
  labels: Record<string, string | boolean>
  /** How many events were merged into it. */
  count: number
  /** Numeric props, summed; the largest for props ending in "Max". */
  values: Record<string, number>
}

const DAY = 24 * 60 * 60 * 1000

/** The start of the UTC day a time is in. */
export const dayOf = (at: number) => Math.floor(at / DAY) * DAY

const entryKey = (name: string, labels: Record<string, string | boolean>) =>
  JSON.stringify([
    name,
    Object.entries(labels).sort(([a], [b]) => (a < b ? -1 : 1)),
  ])

/** Adds events to a day's entries, returning the merged list. */
export function mergeEvents<Name extends string>(
  entries: RollupEntry<Name>[],
  events: { name: Name; props: Record<string, Prop> }[]
): RollupEntry<Name>[] {
  const merged = new Map(
    entries.map((entry) => [
      entryKey(entry.name, entry.labels),
      { ...entry, values: { ...entry.values } },
    ])
  )
  for (const { name, props } of events) {
    const labels: Record<string, string | boolean> = {}
    const values: Record<string, number> = {}
    for (const [key, value] of Object.entries(props))
      if (typeof value === "number") values[key] = value
      else labels[key] = value

    const key = entryKey(name, labels)
    const entry = merged.get(key)
    if (!entry) {
      merged.set(key, { name, labels, count: 1, values })
      continue
    }
    entry.count++
    for (const [prop, value] of Object.entries(values))
      entry.values[prop] =
        prop in entry.values
          ? prop.endsWith("Max")
            ? Math.max(entry.values[prop], value)
            : entry.values[prop] + value
          : value
  }
  return [...merged.values()]
}
