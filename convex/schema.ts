import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export const entitlement = v.object({
  active: v.boolean(),
  // Optional: rows cached before there were plans don't have it. Standard
  // and Extended were the plans before Awma + Cloud; cached rows expire.
  plan: v.optional(
    v.union(
      v.literal("awma"),
      v.literal("standard"),
      v.literal("extended"),
      v.null()
    )
  ),
  planPeriod: v.union(v.literal("month"), v.literal("annual"), v.null()),
  renewsAt: v.union(v.number(), v.null()),
  endsAt: v.union(v.number(), v.null()),
  usageWindow: v.union(
    v.object({ start: v.number(), end: v.number() }),
    v.null()
  ),
})

/** Keep in sync with AnalyticsEvent in the desktop app's packages/protocol. */
export const analyticsEventName = v.union(
  v.literal("app.launched"),
  v.literal("app.crashed"),
  v.literal("command.used"),
  v.literal("action.used"),
  v.literal("usage.summary")
)

export const productCategory = v.union(
  v.literal("Plugins"),
  v.literal("Drum kits"),
  v.literal("Sound kits"),
  v.literal("Presets")
)
export const productFormat = v.union(
  v.literal("VST3"),
  v.literal("AU"),
  v.literal("WAV"),
  v.literal("Preset")
)
/**
 * What an effect does, so the desktop app (and Awma) can find, say, a
 * reverb. Keep in sync with EFFECT_TYPES in the desktop app's
 * packages/protocol.
 */
export const effectType = v.union(
  v.literal("eq"),
  v.literal("compressor"),
  v.literal("limiter"),
  v.literal("reverb"),
  v.literal("delay"),
  v.literal("filter")
)
export const productPlatform = v.union(
  v.literal("macOS"),
  v.literal("Windows"),
  v.literal("Linux")
)

/** How a product is bought: free downloads, or the seller's own store (opened in the browser). */
export const purchase = v.union(
  v.object({ kind: v.literal("free") }),
  v.object({ kind: v.literal("external"), url: v.string() })
)

/**
 * A file the desktop app downloads and installs. "samples" unzips into the
 * app's marketplace folder (in the browser); "plugin" puts the VST3/AU
 * bundles in the zip where macOS looks for plugins.
 */
export const artifact = v.object({
  platform: v.union(productPlatform, v.literal("any")),
  install: v.union(v.literal("samples"), v.literal("plugin")),
  storageId: v.id("_storage"),
  fileName: v.string(),
  byteLength: v.number(),
  sha256: v.string(),
})

export const productFields = {
  slug: v.string(),
  title: v.string(),
  /** Who makes it, e.g. "Xfer Records". */
  vendor: v.string(),
  category: productCategory,
  description: v.string(),
  contents: v.array(v.string()),
  formats: v.array(productFormat),
  platforms: v.array(productPlatform),
  requires: v.union(v.string(), v.null()),
  /** For effect plugins: what they do. Optional: older listings don't have it. */
  effectTypes: v.optional(v.array(effectType)),
  /** In US cents; 0 when free. For external purchases, the seller's list price when it was added. */
  priceCents: v.number(),
  purchase,
  /** The seller's page for the product, credited on the listing. */
  sourceUrl: v.union(v.string(), v.null()),
  /** Listed on the marketplace. */
  published: v.boolean(),
  /** Lower comes first. */
  sortOrder: v.number(),
  /** The Clerk user who listed it; null for products Amarula lists. */
  sellerId: v.union(v.string(), v.null()),
}

export const battleStatus = v.union(
  v.literal("lobby"),
  v.literal("kitVote"),
  v.literal("making"),
  v.literal("listening"),
  v.literal("results"),
  v.literal("closed")
)

export default defineSchema({
  /** Marketplace listings. */
  products: defineTable({
    ...productFields,
    image: v.union(v.id("_storage"), v.null()),
    artifacts: v.array(artifact),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_published_and_sortOrder", ["published", "sortOrder"]),

  /** What each user has gotten from the marketplace. */
  library: defineTable({
    userId: v.string(),
    productId: v.id("products"),
    acquiredAt: v.number(),
  }).index("by_userId_and_productId", ["userId", "productId"]),

  /** Awma's Anthropic spend per user and usage window, in micro-dollars. */
  usage: defineTable({
    userId: v.string(),
    windowStart: v.number(),
    /** Spent on Awma's own model, against the allowance and then packs. */
    micros: v.number(),
    /** Spent in lite mode, once the allowance and packs ran out. */
    liteMicros: v.optional(v.number()),
    /** Kept a while past the window, for support questions (ms). */
    expiresAt: v.number(),
  })
    .index("by_user_window", ["userId", "windowStart"])
    .index("by_expiry", ["expiresAt"]),

  /** What's left of the user's Awma packs, in micro-dollars; kept until used. */
  awmaCredits: defineTable({ userId: v.string(), micros: v.number() }).index(
    "by_user",
    ["userId"]
  ),

  /** DAW licenses: bought once (or given to testers), kept for good. */
  licenses: defineTable({
    userId: v.string(),
    grantedAt: v.number(),
    source: v.union(v.literal("purchase"), v.literal("comp")),
  }).index("by_user", ["userId"]),

  /**
   * One-time purchases fulfilled, by their Stripe Checkout session so each
   * counts once, and by payment so a refund or dispute takes it back.
   */
  purchases: defineTable({
    reference: v.string(),
    userId: v.string(),
    product: v.union(v.literal("license"), v.literal("awmaPack")),
    at: v.number(),
    paymentIntent: v.optional(v.string()),
    revoked: v.optional(v.boolean()),
  })
    .index("by_reference", ["reference"])
    .index("by_payment_intent", ["paymentIntent"]),

  /** Awma requests in flight, for the per-user concurrency limit. */
  running: defineTable({ userId: v.string(), expiresAt: v.number() })
    .index("by_user", ["userId", "expiresAt"])
    .index("by_expiry", ["expiresAt"]),

  /**
   * The desktop app's anonymous, opt-in usage analytics (docs/analytics.md):
   * one row per install, UTC day and app version, merging that day's events
   * (convex/analyticsRollup.ts). installId is random per install and
   * unrelated to the account.
   */
  analyticsDays: defineTable({
    installId: v.string(),
    /** The start of the UTC day (ms). */
    day: v.number(),
    appVersion: v.string(),
    platform: v.string(),
    os: v.string(),
    arch: v.string(),
    events: v.array(
      v.object({
        name: analyticsEventName,
        labels: v.record(v.string(), v.union(v.string(), v.boolean())),
        count: v.number(),
        values: v.record(v.string(), v.number()),
      })
    ),
    expiresAt: v.number(),
  })
    .index("by_installId_and_day_and_appVersion", [
      "installId",
      "day",
      "appVersion",
    ])
    .index("by_expiry", ["expiresAt"]),

  /** Subscription checks, reused for a few minutes before asking Clerk again. */
  entitlements: defineTable({
    userId: v.string(),
    entitlement,
    expiresAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_expiry", ["expiresAt"]),

  /**
   * Beat battles: a lobby picks a marketplace kit, makes beats against the
   * clock, then rates each other's anonymously. Rules in battleRules.ts.
   */
  battles: defineTable({
    /** Invite code, unique among battles that aren't closed. */
    code: v.string(),
    hostId: v.string(),
    status: battleStatus,
    minutes: v.number(),
    /** Whether players may use Awma; submissions say whether they did. */
    awma: v.boolean(),
    /** The kits on offer in the kit vote, then the one chosen (null: no free kits listed). */
    kitOptions: v.array(v.id("products")),
    kitId: v.union(v.id("products"), v.null()),
    /** When the current phase ends (ms); null in the lobby and after. */
    phaseEndsAt: v.union(v.number(), v.null()),
    /** When the making phase's clock runs out; uploads get a short grace period after. */
    submitBy: v.union(v.number(), v.null()),
    createdAt: v.number(),
  })
    .index("by_code_and_status", ["code", "status"])
    .index("by_status_and_createdAt", ["status", "createdAt"]),

  battlePlayers: defineTable({
    battleId: v.id("battles"),
    userId: v.string(),
    name: v.string(),
    joinedAt: v.number(),
    /** Set when they leave after the battle started; they're kept for the results. */
    leftAt: v.union(v.number(), v.null()),
  })
    .index("by_battleId_and_userId", ["battleId", "userId"])
    .index("by_userId", ["userId"]),

  battleKitVotes: defineTable({
    battleId: v.id("battles"),
    userId: v.string(),
    productId: v.id("products"),
  }).index("by_battleId_and_userId", ["battleId", "userId"]),

  battleSubmissions: defineTable({
    battleId: v.id("battles"),
    userId: v.string(),
    /** The beat's audio; null once it's deleted after the battle. */
    storageId: v.union(v.id("_storage"), v.null()),
    fileName: v.string(),
    byteLength: v.number(),
    sha256: v.string(),
    contentType: v.string(),
    usedAwma: v.boolean(),
    submittedAt: v.number(),
    /** Listening order, shuffled when listening starts. */
    order: v.number(),
    /** Filled in when the results are in. */
    result: v.union(
      v.object({
        average: v.union(v.number(), v.null()),
        votes: v.number(),
        rank: v.number(),
        points: v.number(),
      }),
      v.null()
    ),
  })
    .index("by_battleId_and_userId", ["battleId", "userId"])
    .index("by_battleId_and_order", ["battleId", "order"]),

  battleVotes: defineTable({
    battleId: v.id("battles"),
    voterId: v.string(),
    submissionId: v.id("battleSubmissions"),
    score: v.number(),
  }).index("by_battleId_and_voterId_and_submissionId", [
    "battleId",
    "voterId",
    "submissionId",
  ]),

  /** Each player's battle record, for the leaderboard. */
  battleStats: defineTable({
    userId: v.string(),
    name: v.string(),
    battles: v.number(),
    wins: v.number(),
    points: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_points", ["points"]),
})
