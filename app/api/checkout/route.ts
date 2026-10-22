import { auth, currentUser } from "@clerk/nextjs/server"

import { getEntitlement, getLicense } from "@/lib/desktop/entitlement"
import { canPurchase, createCheckout, isPurchaseProduct } from "@/lib/stripe"

const refuse = (message: string) =>
  Response.json({ error: message }, { status: 400 })

/**
 * POST /api/checkout (a form from the dashboard, with `product`): sends the
 * signed-in user to Stripe Checkout for the DAW's license (unless they own
 * it) or an Awma pack (for subscribers, who can use it).
 */
export async function POST(request: Request) {
  const { userId } = await auth()
  const origin = new URL(request.url).origin
  if (!userId) return Response.redirect(`${origin}/sign-in`, 303)

  const product = (await request.formData()).get("product")
  if (!isPurchaseProduct(product) || !canPurchase(product))
    return refuse("That can't be bought right now.")

  try {
    if (product === "license" && (await getLicense(userId)))
      return refuse("You already own Amarula.")
    if (product === "awmaPack" && !(await getEntitlement(userId)).active)
      return refuse("Awma packs are for Awma + Cloud subscribers.")

    const user = await currentUser()
    const url = await createCheckout({
      product,
      userId,
      email: user?.primaryEmailAddress?.emailAddress ?? null,
      origin,
    })
    return Response.redirect(url, 303)
  } catch (error) {
    console.error("Couldn't start checkout", error)
    return Response.json(
      { error: "Checkout isn't available right now. Try again later." },
      { status: 502 }
    )
  }
}
