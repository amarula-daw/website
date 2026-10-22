import { api } from "@/convex/_generated/api"
import { convexMutation } from "@/lib/desktop/convex"
import { isPurchaseProduct, verifyWebhook } from "@/lib/stripe"

type CheckoutSession = {
  id?: string
  payment_status?: string
  payment_intent?: string | null
  client_reference_id?: string | null
  metadata?: { product?: string; userId?: string } | null
}

/** A charge (charge.refunded) or a dispute (charge.dispute.created): both name the payment. */
type PaymentEvent = { payment_intent?: string | null; refunded?: boolean }

/**
 * POST /api/stripe/webhook: Stripe's events for one-time purchases. A paid
 * Checkout session gives the user their license or Awma pack, once; a full
 * refund or a dispute takes it back.
 */
export async function POST(request: Request) {
  const body = await request.text()
  const event = verifyWebhook(body, request.headers.get("stripe-signature"))
  if (!event) return new Response("Bad signature", { status: 400 })

  if (
    event.type === "charge.refunded" ||
    event.type === "charge.dispute.created"
  ) {
    const payment = (event.data?.object ?? {}) as PaymentEvent
    // Partial refunds keep the purchase.
    if (event.type === "charge.refunded" && payment.refunded !== true)
      return new Response(null, { status: 204 })
    if (payment.payment_intent)
      await convexMutation(api.licenses.revoke, {
        paymentIntent: payment.payment_intent,
      })
    return new Response(null, { status: 204 })
  }

  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  )
    return new Response(null, { status: 204 })

  const session = (event.data?.object ?? {}) as CheckoutSession
  // Delayed payment methods complete unpaid, then succeed later.
  if (session.payment_status !== "paid")
    return new Response(null, { status: 204 })

  const userId = session.client_reference_id ?? session.metadata?.userId
  const product = session.metadata?.product
  if (!session.id || !userId || !isPurchaseProduct(product)) {
    console.error("A paid Checkout session isn't one of ours", session.id)
    return new Response(null, { status: 204 })
  }

  await convexMutation(api.licenses.fulfill, {
    userId,
    product,
    reference: session.id,
    paymentIntent: session.payment_intent ?? undefined,
  })
  return new Response(null, { status: 204 })
}
