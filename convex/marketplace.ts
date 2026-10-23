import { ConvexError, v } from "convex/values"

import type { Doc } from "./_generated/dataModel"
import { mutation, query, type QueryCtx } from "./_generated/server"
import { artifact, productFields, productPlatform } from "./schema"
import { checkSecret, secretArg } from "./server"

/** The most listings the marketplace shows (there's no paging yet). */
const MAX_PRODUCTS = 200

/** The listing's own fields, without internal ones. */
function pick({
  slug,
  title,
  vendor,
  category,
  description,
  contents,
  formats,
  platforms,
  requires,
  effectTypes,
  priceCents,
  purchase,
  sourceUrl,
}: Omit<Doc<"products">, "_id" | "image" | "artifacts">) {
  return {
    slug,
    title,
    vendor,
    category,
    description,
    contents,
    formats,
    platforms,
    requires,
    effectTypes: effectTypes ?? [],
    priceCents,
    purchase,
    sourceUrl,
  }
}

/** A listing as the website and the desktop app see it: no storage ids. */
async function toPublic(ctx: QueryCtx, product: Doc<"products">) {
  const { _id, image, artifacts, ...fields } = product
  return {
    ...pick(fields),
    id: _id,
    imageUrl: image ? await ctx.storage.getUrl(image) : null,
    downloads: artifacts.map(({ platform, install, byteLength, sha256 }) => ({
      platform,
      install,
      byteLength,
      sha256,
    })),
  }
}

/** Published listings, in order. */
export const list = query({
  args: { ...secretArg },
  handler: async (ctx, { secret }) => {
    checkSecret(secret)
    const products = await ctx.db
      .query("products")
      .withIndex("by_published_and_sortOrder", (q) => q.eq("published", true))
      .take(MAX_PRODUCTS)
    return Promise.all(products.map((product) => toPublic(ctx, product)))
  },
})

/** One published listing, or null. */
export const get = query({
  args: { ...secretArg, slug: v.string() },
  handler: async (ctx, { secret, slug }) => {
    checkSecret(secret)
    const product = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique()
    return product?.published ? toPublic(ctx, product) : null
  },
})

/**
 * Where to download a free product for a platform, adding it to the user's
 * library when they're signed in. Products sold elsewhere can't be
 * downloaded here.
 */
export const download = mutation({
  args: {
    ...secretArg,
    slug: v.string(),
    platform: productPlatform,
    userId: v.union(v.string(), v.null()),
  },
  handler: async (ctx, { secret, slug, platform, userId }) => {
    checkSecret(secret)
    const product = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique()
    if (!product?.published) throw new ConvexError("Product not found")
    if (product.purchase.kind !== "free")
      throw new ConvexError("This product is sold on its maker's website")
    const file =
      product.artifacts.find((item) => item.platform === platform) ??
      product.artifacts.find((item) => item.platform === "any")
    if (!file)
      throw new ConvexError(`${product.title} has no download for ${platform}`)
    const url = await ctx.storage.getUrl(file.storageId)
    if (!url) throw new ConvexError("The download is missing")

    if (userId) {
      const owned = await ctx.db
        .query("library")
        .withIndex("by_userId_and_productId", (q) =>
          q.eq("userId", userId).eq("productId", product._id)
        )
        .unique()
      if (!owned)
        await ctx.db.insert("library", {
          userId,
          productId: product._id,
          acquiredAt: Date.now(),
        })
    }

    return {
      slug: product.slug,
      title: product.title,
      vendor: product.vendor,
      install: file.install,
      fileName: file.fileName,
      byteLength: file.byteLength,
      sha256: file.sha256,
      url,
    }
  },
})

/** The products a user has gotten, newest first. */
export const library = query({
  args: { ...secretArg, userId: v.string() },
  handler: async (ctx, { secret, userId }) => {
    checkSecret(secret)
    const rows = await ctx.db
      .query("library")
      .withIndex("by_userId_and_productId", (q) => q.eq("userId", userId))
      .take(MAX_PRODUCTS)
    const items = []
    for (const row of rows) {
      const product = await ctx.db.get("products", row.productId)
      if (product)
        items.push({
          ...(await toPublic(ctx, product)),
          acquiredAt: row.acquiredAt,
        })
    }
    return items.sort((a, b) => b.acquiredAt - a.acquiredAt)
  },
})

// ---------------------------------------------------------------------------
// Listing products (scripts/marketplace-seed.ts for now; sellers later)

export const generateUploadUrl = mutation({
  args: { ...secretArg },
  handler: async (ctx, { secret }) => {
    checkSecret(secret)
    return ctx.storage.generateUploadUrl()
  },
})

/** Creates or updates a listing by slug, keeping its image and downloads unless given new ones. */
export const upsert = mutation({
  args: {
    ...secretArg,
    product: v.object(productFields),
    image: v.optional(v.id("_storage")),
    artifacts: v.optional(v.array(artifact)),
  },
  handler: async (ctx, { secret, product, image, artifacts }) => {
    checkSecret(secret)
    const existing = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", product.slug))
      .unique()
    const updatedAt = Date.now()
    if (!existing)
      return ctx.db.insert("products", {
        ...product,
        image: image ?? null,
        artifacts: artifacts ?? [],
        updatedAt,
      })

    // Replaced files aren't needed any more.
    if (image && existing.image && existing.image !== image)
      await ctx.storage.delete(existing.image)
    if (artifacts)
      for (const old of existing.artifacts)
        if (!artifacts.some((item) => item.storageId === old.storageId))
          await ctx.storage.delete(old.storageId)

    await ctx.db.patch("products", existing._id, {
      ...product,
      ...(image ? { image } : {}),
      ...(artifacts ? { artifacts } : {}),
      updatedAt,
    })
    return existing._id
  },
})

/** What a listing already has, so the seed script can skip unchanged uploads. */
export const files = query({
  args: { ...secretArg, slug: v.string() },
  handler: async (ctx, { secret, slug }) => {
    checkSecret(secret)
    const product = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique()
    return product
      ? { hasImage: product.image !== null, artifacts: product.artifacts }
      : null
  },
})
