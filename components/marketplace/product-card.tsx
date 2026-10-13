import Link from "next/link"
import { AudioLines, SlidersHorizontal, Drum, Piano } from "lucide-react"
import { formatPrice, type PreviewProduct } from "@/lib/marketplace/catalog"

const icons = {
  Plugins: SlidersHorizontal,
  "Drum kits": Drum,
  "Sound kits": AudioLines,
  Presets: Piano,
}

export function ProductCard({ product }: { product: PreviewProduct }) {
  const Icon = icons[product.category]
  return (
    <Link href={`/marketplace/${product.slug}`} className="product-card">
      <div className="product-art" aria-hidden="true">
        <Icon size={48} strokeWidth={1} />
      </div>
      <div className="product-card-content">
        <p className="product-kind">{product.category}</p>
        <h2>{product.title}</h2>
        <p className="product-formats">{product.formats.join(" / ")}</p>
        <div className="product-card-bottom">
          <span>Preview listing</span>
          <span>{formatPrice(product.priceCents)}</span>
        </div>
      </div>
    </Link>
  )
}
