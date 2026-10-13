import Link from "next/link"
import type { Metadata } from "next"
import { MarketplaceShell } from "@/components/marketplace/marketplace-shell"
import { ProductCard } from "@/components/marketplace/product-card"
import {
  categories,
  formats,
  platforms,
  filterProducts,
} from "@/lib/marketplace/catalog"

export const metadata: Metadata = {
  title: "Marketplace — Amarula",
  description:
    "Preview Amarula’s marketplace for plugins, drum kits, sound kits, and presets.",
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const search = await searchParams
  const value = (key: string) =>
    typeof search[key] === "string" ? search[key] : ""
  const query = value("q").slice(0, 120)
  const category = categories.find((item) => item === value("category")) ?? ""
  const format = formats.find((item) => item === value("format")) ?? ""
  const platform = platforms.find((item) => item === value("platform")) ?? ""
  const products = filterProducts({ query, category, format, platform })

  return (
    <MarketplaceShell>
      <div className="marketplace-title">
        <div>
          <h1>Marketplace</h1>
          <p>Plugins, drum kits, sound kits, and presets.</p>
        </div>
        <Link
          className="marketplace-secondary-button"
          href="/dashboard?section=seller"
        >
          Create a listing
        </Link>
      </div>
      <form className="marketplace-filters" action="/marketplace" method="get">
        <label className="marketplace-search">
          Search
          <input
            name="q"
            defaultValue={query}
            maxLength={120}
            type="search"
            placeholder="Search the preview catalog"
          />
        </label>
        <label>
          Category
          <select name="category" defaultValue={category}>
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Format
          <select name="format" defaultValue={format}>
            <option value="">All formats</option>
            {formats.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Platform
          <select name="platform" defaultValue={platform}>
            <option value="">All platforms</option>
            {platforms.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <button className="waitlist-button" type="submit">
          Search
        </button>
      </form>
      <div className="marketplace-results">
        <p>
          {products.length}{" "}
          {products.length === 1 ? "preview listing" : "preview listings"}
        </p>
        {(query || category || format || platform) && (
          <Link href="/marketplace">Clear filters</Link>
        )}
      </div>
      {products.length ? (
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      ) : (
        <div className="marketplace-empty">
          <h2>No matching listings</h2>
          <p>Try a different search or clear your filters.</p>
          <Link href="/marketplace">Show all listings</Link>
        </div>
      )}
    </MarketplaceShell>
  )
}
