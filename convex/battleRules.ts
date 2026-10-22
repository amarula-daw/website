/*
 * Beat battle rules that don't need the database: timings, invite codes,
 * picking kits and ranking submissions. Shared by convex/battles.ts and the
 * website's routes, and tested in lib/battles/rules.test.ts.
 */

/** How long a battle's making phase can be, in minutes. */
export const battleLengths = [20, 30, 60] as const
export type BattleLength = (typeof battleLengths)[number]

export const MAX_PLAYERS = 8
export const MIN_PLAYERS = 2
/** Kits offered in the kit vote. */
export const KIT_OPTIONS = 3
export const KIT_VOTE_MS = 30_000
/** Uploads still count this long after the clock runs out (exports take a moment). */
export const SUBMIT_GRACE_MS = 60_000
/** Listening time per submission, with a floor, so everyone can hear everything. */
export const LISTEN_MS_PER_TRACK = 90_000
export const LISTEN_MIN_MS = 5 * 60_000
/** Lobbies that never start are closed after this long. */
export const LOBBY_TTL_MS = 2 * 60 * 60_000
/** A beat exported as MP3 or WAV; a few minutes of 24-bit stereo WAV fits. */
export const MAX_SUBMISSION_BYTES = 100 * 1024 * 1024
/**
 * Beats' audio is deleted this long after the results, to stay within
 * Convex's file storage; players keep the copies their app downloaded.
 */
export const BEAT_RETENTION_MS = 24 * 60 * 60_000
/**
 * The upload's audio type: from its Content-Type, or its file name when it
 * was uploaded without one; null when it isn't MP3 or WAV.
 */
export function submissionType(
  contentType: string | undefined,
  fileName: string
) {
  if (contentType === "audio/mpeg") return "audio/mpeg"
  if (contentType === "audio/wav" || contentType === "audio/x-wav")
    return "audio/wav"
  if (contentType) return null
  if (/\.mp3$/i.test(fileName)) return "audio/mpeg"
  if (/\.wav$/i.test(fileName)) return "audio/wav"
  return null
}

export const MIN_SCORE = 1
export const MAX_SCORE = 5

export const CODE_LENGTH = 6
/** No 0/O, 1/I/L: codes are read aloud and typed. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

export function makeCode(random: () => number) {
  let code = ""
  for (let i = 0; i < CODE_LENGTH; i++)
    code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)]
  return code
}

/** An invite code as typed (any case, spaces or dashes), or null if it can't be one. */
export function normalizeCode(input: string) {
  const code = input.toUpperCase().replace(/[\s-]/g, "")
  if (code.length !== CODE_LENGTH) return null
  for (const char of code) if (!CODE_ALPHABET.includes(char)) return null
  return code
}

/** Up to `count` distinct items in random order. */
export function pickRandom<T>(items: T[], random: () => number, count: number) {
  const pool = [...items]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count)
}

/** The kit with the most votes; ties (and no votes at all) are settled at random. */
export function kitWinner<T>(options: T[], votes: T[], random: () => number) {
  if (options.length === 0) return null
  const counts = options.map(
    (option) => votes.filter((vote) => vote === option).length
  )
  const most = Math.max(...counts)
  const leaders = options.filter((_, i) => counts[i] === most)
  return pickRandom(leaders, random, 1)[0]
}

export function listeningMs(submissions: number) {
  return Math.max(LISTEN_MIN_MS, submissions * LISTEN_MS_PER_TRACK)
}

/** "Track A", "Track B", …, "Track AA" past 26. */
export function trackLabel(index: number) {
  let label = ""
  let n = index
  do {
    label = String.fromCharCode(65 + (n % 26)) + label
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return `Track ${label}`
}

export type Ranked<Id> = {
  id: Id
  /** Mean score, or null with no votes. */
  average: number | null
  votes: number
  /** 1 is first; equal averages share a rank (1, 1, 3). */
  rank: number
  /** Leaderboard points: one for each submission ranked below it. */
  points: number
}

/** Ranks submissions by their average score; unvoted ones come last. */
export function rankSubmissions<Id>(
  ids: Id[],
  votes: { submission: Id; score: number }[]
): Ranked<Id>[] {
  const scored = ids.map((id) => {
    const scores = votes
      .filter((vote) => vote.submission === id)
      .map((vote) => vote.score)
    const average =
      scores.length === 0
        ? null
        : scores.reduce((sum, score) => sum + score, 0) / scores.length
    return { id, average, votes: scores.length }
  })
  const value = (item: { average: number | null }) => item.average ?? -1
  scored.sort((a, b) => value(b) - value(a))
  return scored.map((item) => {
    const rank = 1 + scored.filter((other) => value(other) > value(item)).length
    const points = scored.filter((other) => value(other) < value(item)).length
    return { ...item, rank, points }
  })
}
