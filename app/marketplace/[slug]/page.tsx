import Link from "next/link"
import { notFound } from "next/navigation"
import { MarketplaceShell } from "@/components/marketplace/marketplace-shell"
import { previewProducts, formatPrice } from "@/lib/marketplace/catalog"

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const product = previewProducts.find((item) => item.slug === slug)
  if (!product) notFound()

  return (
    <MarketplaceShell>
      <Link className="marketplace-back" href="/marketplace">
        Back to marketplace
      </Link>
      <article className="product-detail">
        <div>
          <p className="product-kind">{product.category}</p>
          <h1>{product.title}</h1>
          <p className="product-description">{product.description}</p>
          <section>
            <h2>What’s included</h2>
            <ul>
              {product.contents.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section>
            <h2>Compatibility</h2>
            <p>
              {product.formats.join(" / ")} · {product.platforms.join(", ")}
            </p>
            {product.formats.includes("AU") && (
              <p>AU is available on macOS only.</p>
            )}
            {product.requires && <p>Requires {product.requires}.</p>}
          </section>
        </div>
        <aside className="product-purchase">
          <span>Example price</span>
          <p className="product-price">{formatPrice(product.priceCents)}</p>
          <p>
            This is a fictional listing for the marketplace preview. No files
            are for sale.
          </p>
          <button className="waitlist-button" disabled>
            Purchases coming later
          </button>
          <p className="product-delivery-note">
            Purchased items will appear in your library. Direct downloads into
            Amarula are planned.
          </p>
        </aside>
      </article>
    </MarketplaceShell>
  )
}
