import { describe, it as test } from "node:test"
import assert from "node:assert/strict"
import { filterProducts } from "./catalog"
import { parseDrafts, listingConfigurationError } from "./drafts"

describe("marketplace compatibility", () => {
  test("AU results require macOS even when the product also has Windows VST3", () => {
    assert.equal(
      filterProducts({ format: "AU", platform: "Windows" }).length,
      0
    )
    assert.deepEqual(
      filterProducts({ format: "AU", platform: "macOS" }).map(
        (item) => item.slug
      ),
      ["glass-filter"]
    )
  })
  test("filters compose and text search ignores case", () => {
    assert.deepEqual(
      filterProducts({
        category: "Plugins",
        platform: "Linux",
        query: " MONO ",
      }).map((item) => item.slug),
      ["mono-synth"]
    )
    assert.equal(
      filterProducts({ category: "Presets", query: "no matching title" })
        .length,
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
