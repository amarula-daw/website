import Link from "next/link"
import { notFound } from "next/navigation"
import { MarketplaceShell } from "@/components/marketplace/marketplace-shell"
import { formatPrice } from "@/lib/marketplace/catalog"
import { getProduct } from "@/lib/marketplace/products"

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) notFound()

  return (
    <MarketplaceShell>
      <Link className="marketplace-back" href="/marketplace">
        Back to marketplace
      </Link>
      <article className="product-detail">
        <div>
          <p className="product-kind">
            {product.category} · {product.vendor}
          </p>
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
          {product.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- Convex storage URLs
            <img className="product-image" src={product.imageUrl} alt="" />
          )}
          <span>
            {product.purchase.kind === "free" ? "Price" : "List price"}
          </span>
          <p className="product-price">{formatPrice(product.priceCents)}</p>
          {product.purchase.kind === "free" ? (
            <>
              <p>
                Open the Marketplace in Amarula’s hub and choose Install: the
                kit downloads into your browser’s Marketplace folder, ready to
                drag into a project.
              </p>
              {product.sourceUrl && (
                <a
                  className="marketplace-secondary-button"
                  href={product.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  More from {product.vendor}
                </a>
              )}
            </>
          ) : (
            <>
              <a
                className="waitlist-button"
                href={product.purchase.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Buy from {product.vendor}
              </a>
              <p className="product-delivery-note">
                Sold and delivered by {product.vendor}; the price there may
                differ. Install it with their installer, then Amarula finds it
                in its next plugin scan.
              </p>
            </>
          )}
        </aside>
      </article>
    </MarketplaceShell>
  )
}
