import { describe, it as test } from "node:test"
import assert from "node:assert/strict"
import { filterProducts, type Product } from "./catalog"
import { parseDrafts, listingConfigurationError } from "./drafts"

const product = (
  fields: Partial<Product> & Pick<Product, "slug">
): Product => ({
  id: fields.slug,
  title: fields.slug,
  vendor: "Vendor",
  category: "Plugins",
  description: "",
  contents: [],
  formats: ["VST3"],
  platforms: ["macOS"],
  requires: null,
  priceCents: 0,
  purchase: { kind: "free" },
  sourceUrl: null,
  imageUrl: null,
  downloads: [],
  ...fields,
})

const products = [
  product({
    slug: "glass-filter",
    formats: ["VST3", "AU"],
    platforms: ["macOS", "Windows"],
  }),
  product({
    slug: "mono-synth",
    title: "Mono Synth",
    platforms: ["macOS", "Windows", "Linux"],
  }),
  product({ slug: "mono-bank", category: "Presets", formats: ["Preset"] }),
]

describe("marketplace compatibility", () => {
  test("AU results require macOS even when the product also has Windows VST3", () => {
    assert.equal(
      filterProducts(products, { format: "AU", platform: "Windows" }).length,
      0
    )
    assert.deepEqual(
      filterProducts(products, { format: "AU", platform: "macOS" }).map(
        (item) => item.slug
      ),
      ["glass-filter"]
    )
  })
  test("filters compose and text search ignores case", () => {
    assert.deepEqual(
      filterProducts(products, {
        category: "Plugins",
        platform: "Linux",
        query: " MONO ",
      }).map((item) => item.slug),
      ["mono-synth"]
    )
    assert.equal(
      filterProducts(products, {
        category: "Presets",
        query: "no matching title",
      }).length,
      0
    )
  })
})

describe("local draft recovery", () => {
  test("corrupt or incompatible browser data does not break the studio", () => {
    assert.deepEqual(parseDrafts("{not json"), [])
    assert.deepEqual(parseDrafts('{"title":"wrong shape"}'), [])
    assert.deepEqual(parseDrafts('[{"title":"not a complete listing"}]'), [])
  })
})

describe("seller listing compatibility", () => {
  test("an AU-only draft cannot claim Windows support", () => {
    assert.notEqual(
      listingConfigurationError({
        category: "Plugins",
        formats: ["AU"],
        platforms: ["macOS", "Windows"],
        requires: "",
      }),
      null
    )
    assert.equal(
      listingConfigurationError({
        category: "Plugins",
        formats: ["AU", "VST3"],
        platforms: ["macOS", "Windows"],
        requires: "",
      }),
      null
    )
  })
  test("presets require an identified instrument", () => {
    assert.notEqual(
      listingConfigurationError({
        category: "Presets",
        formats: ["Preset"],
        platforms: ["macOS"],
        requires: "  ",
      }),
      null
    )
  })
})
