import { createHmac, timingSafeEqual } from "node:crypto"

import { awmaPack, dawCurrency, dawLicense } from "@/lib/daw-subscription"

/*
 * One-time purchases through Stripe Checkout: the DAW's license and Awma
 * packs (subscriptions go through Clerk Billing). Called with Stripe's REST
 * API; the webhook (app/api/stripe/webhook) fulfills paid sessions.
 *
 * STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and a one-time Price for each
 * product: STRIPE_LICENSE_PRICE_ID ($99) and STRIPE_AWMA_PACK_PRICE_ID ($10).
 */

const STRIPE_API = "https://api.stripe.com/v1"
/** How old a webhook's signature may be, like Stripe's own libraries (s). */
const SIGNATURE_TOLERANCE = 5 * 60

export const purchaseProducts = ["license", "awmaPack"] as const
export type PurchaseProduct = (typeof purchaseProducts)[number]

const products: Record<PurchaseProduct, { priceEnv: string; cents: number }> = {
  license: {
    priceEnv: "STRIPE_LICENSE_PRICE_ID",
    cents: dawLicense.priceCents,
  },
  awmaPack: {
    priceEnv: "STRIPE_AWMA_PACK_PRICE_ID",
    cents: awmaPack.priceCents,
  },
}

/** Prices already found to be the agreed ones, so checkout asks Stripe once per server. */
const verifiedPrices = new Set<string>()

export function isPurchaseProduct(value: unknown): value is PurchaseProduct {
  return purchaseProducts.some((product) => product === value)
}

/** Whether a product can be bought: Stripe and its price are set up. */
export function canPurchase(product: PurchaseProduct) {
  return Boolean(
    process.env.STRIPE_SECRET_KEY && process.env[products[product].priceEnv]
  )
}

async function stripe(path: string, form?: Record<string, string>) {
  const response = await fetch(`${STRIPE_API}${path}`, {
    method: form ? "POST" : "GET",
    headers: {
      authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      ...(form ? { "content-type": "application/x-www-form-urlencoded" } : {}),
    },
    body: form ? new URLSearchParams(form) : undefined,
  })
  const json = await response.json()
  if (!response.ok)
    throw new Error(
      `Stripe ${path}: ${json?.error?.message ?? response.status}`
    )
  return json
}

/**
 * Starts Checkout for one of the user's purchases; returns its URL. Refuses
 * a price in Stripe that isn't the agreed one, like the subscription's check.
 */
export async function createCheckout({
  product,
  userId,
  email,
  origin,
}: {
  product: PurchaseProduct
  userId: string
  email: string | null
  origin: string
}) {
  const { priceEnv, cents } = products[product]
  const priceId = process.env[priceEnv]
  if (!priceId) throw new Error(`${priceEnv} isn't set`)
  if (!verifiedPrices.has(priceId)) {
    const price = await stripe(`/prices/${encodeURIComponent(priceId)}`)
    if (
      price.type !== "one_time" ||
      price.unit_amount !== cents ||
      String(price.currency).toUpperCase() !== dawCurrency
    )
      throw new Error(`${priceEnv} isn't the agreed one-time price`)
    verifiedPrices.add(priceId)
  }

  const back = `${origin}/dashboard?section=subscription`
  const session = await stripe("/checkout/sessions", {
    mode: "payment",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    client_reference_id: userId,
    "metadata[product]": product,
    "metadata[userId]": userId,
    success_url: `${back}&purchased=${product}`,
    cancel_url: back,
    ...(email ? { customer_email: email } : {}),
  })
  return String(session.url)
}

/**
 * The event a webhook delivered, if its Stripe-Signature header (t=…,v1=…)
 * signs this exact body with STRIPE_WEBHOOK_SECRET and isn't stale.
 */
export function verifyWebhook(
  body: string,
  header: string | null,
  secret = process.env.STRIPE_WEBHOOK_SECRET,
  now = Date.now()
) {
  if (!header || !secret) return null
  const parts = header.split(",").map((part) => part.trim().split("="))
  const timestamp = Number(parts.find(([key]) => key === "t")?.[1])
  const signatures = parts
    .filter(([key]) => key === "v1")
    .map(([, value]) => value ?? "")
  if (!Number.isFinite(timestamp) || signatures.length === 0) return null
  if (Math.abs(now / 1000 - timestamp) > SIGNATURE_TOLERANCE) return null

  const expected = Buffer.from(
    createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")
  )
  const valid = signatures.some((signature) => {
    const given = Buffer.from(signature)
    return given.length === expected.length && timingSafeEqual(given, expected)
  })
  if (!valid) return null
  try {
    return JSON.parse(body) as { type?: string; data?: { object?: unknown } }
  } catch {
    return null
  }
}
