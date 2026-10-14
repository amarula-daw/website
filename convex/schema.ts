import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export const entitlement = v.object({
  active: v.boolean(),
  planPeriod: v.union(v.literal("month"), v.literal("annual"), v.null()),
  renewsAt: v.union(v.number(), v.null()),
  endsAt: v.union(v.number(), v.null()),
  usageWindow: v.union(
    v.object({ start: v.number(), end: v.number() }),
    v.null()
  ),
})

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
    micros: v.number(),
    /** Kept a while past the window, for support questions (ms). */
    expiresAt: v.number(),
  })
    .index("by_user_window", ["userId", "windowStart"])
    .index("by_expiry", ["expiresAt"]),

  /** Awma requests in flight, for the per-user concurrency limit. */
  running: defineTable({ userId: v.string(), expiresAt: v.number() })
    .index("by_user", ["userId", "expiresAt"])
    .index("by_expiry", ["expiresAt"]),

  /** Subscription checks, reused for a few minutes before asking Clerk again. */
  entitlements: defineTable({
    userId: v.string(),
    entitlement,
    expiresAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_expiry", ["expiresAt"]),
})
