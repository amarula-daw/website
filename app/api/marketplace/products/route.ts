import { listProducts } from "@/lib/marketplace/products"

/** GET /api/marketplace/products: the marketplace's listings, for the desktop app. */
export async function GET() {
  return Response.json(
    { products: await listProducts() },
    { headers: { "cache-control": "public, max-age=60" } }
  )
}
