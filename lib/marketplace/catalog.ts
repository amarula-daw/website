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

export type PreviewProduct = {
  slug: string
  title: string
  category: Category
  description: string
  priceCents: number
  formats: ProductFormat[]
  platforms: Platform[]
  contents: string[]
  requires?: string
}

// Fictional fixtures for the marketplace prototype. No purchasable files or sellers.
export const previewProducts: PreviewProduct[] = [
  {
    slug: "glass-filter",
    title: "Glass Filter",
    category: "Plugins",
    description:
      "A preview of how an audio effect will be listed, with separate plugin formats and platform compatibility.",
    priceCents: 2900,
    formats: ["VST3", "AU"],
    platforms: ["macOS", "Windows"],
    contents: [
      "VST3 build for macOS and Windows",
      "AU build for macOS",
      "Setup guide",
    ],
  },
  {
    slug: "mono-synth",
    title: "Mono Synth",
    category: "Plugins",
    description:
      "An example instrument listing with a VST3 release for each supported platform.",
    priceCents: 4900,
    formats: ["VST3"],
    platforms: ["macOS", "Windows", "Linux"],
    contents: ["VST3 builds", "Factory presets", "Setup guide"],
  },
  {
    slug: "dry-drums",
    title: "Dry Drums",
    category: "Drum kits",
    description:
      "An example kit for browsing kicks, snares, hats, and percussion before adding them to your library.",
    priceCents: 1200,
    formats: ["WAV"],
    platforms: ["macOS", "Windows", "Linux"],
    contents: ["Kick samples", "Snare samples", "Hi-hats and percussion"],
  },
  {
    slug: "room-drums",
    title: "Room Drums",
    category: "Drum kits",
    description:
      "A second kit preview showing how one-shot samples and loops can be packaged together.",
    priceCents: 1800,
    formats: ["WAV"],
    platforms: ["macOS", "Windows", "Linux"],
    contents: ["Drum one-shots", "Drum loops", "Tempo notes"],
  },
  {
    slug: "soft-textures",
    title: "Soft Textures",
    category: "Sound kits",
    description:
      "A sound kit preview for textures, tonal samples, and longer recordings.",
    priceCents: 1600,
    formats: ["WAV"],
    platforms: ["macOS", "Windows", "Linux"],
    contents: ["Tonal samples", "Atmospheres", "Texture recordings"],
  },
  {
    slug: "mono-bank",
    title: "Mono Bank",
    category: "Presets",
    description:
      "An example preset pack that makes its required instrument clear before purchase.",
    priceCents: 800,
    formats: ["Preset"],
    platforms: ["macOS", "Windows", "Linux"],
    contents: ["Bass presets", "Lead presets", "Installation notes"],
    requires: "Mono Synth (preview instrument)",
  },
]

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

export function formatPrice(cents: number) {
  return priceFormatter.format(cents / 100)
}

export function filterProducts({
  query = "",
  category = "",
  format = "",
  platform = "",
}: {
  query?: string
  category?: string
  format?: string
  platform?: string
}) {
  const needle = query.trim().toLowerCase()
  return previewProducts.filter(
    (product) =>
      (!category || product.category === category) &&
      (!format || product.formats.some((value) => value === format)) &&
      (!platform || product.platforms.some((value) => value === platform)) &&
      (format !== "AU" || !platform || platform === "macOS") &&
      (!needle ||
        `${product.title} ${product.category} ${product.description} ${product.formats.join(" ")}`
          .toLowerCase()
          .includes(needle))
  )
}
