import Link from "next/link"
import { AudioLines, SlidersHorizontal, Drum, Piano } from "lucide-react"
import { formatPrice, type Product } from "@/lib/marketplace/catalog"

const icons = {
  Plugins: SlidersHorizontal,
  "Drum kits": Drum,
  "Sound kits": AudioLines,
  Presets: Piano,
}

export function ProductCard({ product }: { product: Product }) {
  const Icon = icons[product.category]
  return (
    <Link href={`/marketplace/${product.slug}`} className="product-card">
      <div className="product-art" aria-hidden="true">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Convex storage URLs
          <img src={product.imageUrl} alt="" loading="lazy" />
        ) : (
          <Icon size={48} strokeWidth={1} />
        )}
      </div>
      <div className="product-card-content">
        <p className="product-kind">
          {product.category} · {product.vendor}
        </p>
        <h2>{product.title}</h2>
        <p className="product-formats">{product.formats.join(" / ")}</p>
        <div className="product-card-bottom">
          <span>
            {product.purchase.kind === "free"
              ? "Installs in Amarula"
              : "Sold by " + product.vendor}
          </span>
          <span>{formatPrice(product.priceCents)}</span>
        </div>
      </div>
    </Link>
  )
}
