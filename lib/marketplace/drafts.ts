import {
  categories,
  formats,
  platforms,
  type Category,
  type Platform,
  type ProductFormat,
} from "./catalog"

export type DraftListing = {
  id: string
  title: string
  description: string
  category: Category
  priceCents: number
  formats: ProductFormat[]
  platforms: Platform[]
  requires: string
  files: { name: string; size: number }[]
  updatedAt: string
}

export function listingConfigurationError({
  category,
  formats,
  platforms,
  requires,
}: Pick<DraftListing, "category" | "formats" | "platforms" | "requires">) {
  if (!formats.length || !platforms.length)
    return "Select a format and at least one platform."
  if (formats.includes("AU") && !platforms.includes("macOS"))
    return "Audio Unit listings need a macOS build."
  if (
    formats.every((format) => format === "AU") &&
    platforms.some((platform) => platform !== "macOS")
  ) {
    return "AU-only listings support macOS. Select VST3 to include other platforms."
  }
  if (category === "Presets" && !requires.trim())
    return "Name the plugin or instrument these presets require."
  return null
}

const validCategories = new Set<string>(categories)
const validFormats = new Set<string>(formats)
const validPlatforms = new Set<string>(platforms)

function isDraft(value: unknown): value is DraftListing {
  if (!value || typeof value !== "object") return false
  const item = value as Record<string, unknown>
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.description === "string" &&
    typeof item.category === "string" &&
    validCategories.has(item.category) &&
    typeof item.priceCents === "number" &&
    Number.isSafeInteger(item.priceCents) &&
    item.priceCents >= 0 &&
    typeof item.requires === "string" &&
    typeof item.updatedAt === "string" &&
    Array.isArray(item.formats) &&
    item.formats.length > 0 &&
    item.formats.every((format) => validFormats.has(format)) &&
    Array.isArray(item.platforms) &&
    item.platforms.length > 0 &&
    item.platforms.every((platform) => validPlatforms.has(platform)) &&
    Array.isArray(item.files) &&
    item.files.every(
      (file) =>
        file &&
        typeof file.name === "string" &&
        typeof file.size === "number" &&
        Number.isFinite(file.size) &&
        file.size >= 0
    )
  )
}

export function parseDrafts(raw: string | null): DraftListing[] {
  if (!raw) return []
  try {
    const values: unknown = JSON.parse(raw)
    return Array.isArray(values) ? values.filter(isDraft).slice(0, 100) : []
  } catch {
    return []
  }
}
