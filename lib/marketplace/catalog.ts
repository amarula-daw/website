export const categories = [
  "Plugins",
  "Drum kits",
  "Sound kits",
  "Presets",
] as const
export type Category = (typeof categories)[number]
export const platforms = ["macOS", "Windows", "Linux"] as const
export type Platform = (typeof platforms)[number]
export const formats = ["VST3", "AU", "WAV", "Preset"] as const
export type ProductFormat = (typeof formats)[number]

/** A marketplace listing, as lib/marketplace/products.ts returns it. */
export type Product = {
  id: string
  slug: string
  title: string
  vendor: string
  category: Category
  description: string
  contents: string[]
  formats: ProductFormat[]
  platforms: Platform[]
  requires: string | null
  priceCents: number
  purchase: { kind: "free" } | { kind: "external"; url: string }
  sourceUrl: string | null
  imageUrl: string | null
  downloads: {
    platform: Platform | "any"
    install: "samples" | "plugin"
    byteLength: number
    sha256: string
  }[]
}

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

export function formatPrice(cents: number) {
  return cents === 0 ? "Free" : priceFormatter.format(cents / 100)
}

export function filterProducts(
  products: Product[],
  {
    query = "",
    category = "",
    format = "",
    platform = "",
  }: {
    query?: string
    category?: string
    format?: string
    platform?: string
  }
) {
  const needle = query.trim().toLowerCase()
  return products.filter(
    (product) =>
      (!category || product.category === category) &&
      (!format || product.formats.some((value) => value === format)) &&
      (!platform || product.platforms.some((value) => value === platform)) &&
      (format !== "AU" || !platform || platform === "macOS") &&
      (!needle ||
        `${product.title} ${product.vendor} ${product.category} ${product.description} ${product.formats.join(" ")}`
          .toLowerCase()
          .includes(needle))
  )
}
