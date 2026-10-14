import "server-only"

import { api } from "@/convex/_generated/api"
import { convexQuery } from "@/lib/desktop/convex"
import type { Product } from "@/lib/marketplace/catalog"

/** Published marketplace listings, in order. */
export async function listProducts(): Promise<Product[]> {
  return convexQuery(api.marketplace.list, {})
}

/** A published listing, or null. */
export async function getProduct(slug: string): Promise<Product | null> {
  return convexQuery(api.marketplace.get, { slug })
}
