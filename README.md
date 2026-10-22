# Amarula website

A minimal homepage for Amarula and Awma: React Bits Liquid Chrome (non-interactive), Motion Primitives TextEffect, and Fancy Components' sticky-footer reveal. Reduced motion freezes the shader and displays the title without movement. The shader pauses when hidden or offscreen and uses a limited pixel ratio. The page remains readable if WebGL is unavailable.

The compact, centered floating navbar contains page icons, the waitlist link and Skiper4’s sun/moon toggle with Skiper26’s blurred rectangle transition from the bottom. It follows the device theme by default; toggling saves a light/dark preference. The shader and Clerk UI follow the selected theme. Liquid Chrome introduces itself on page load, the title rises character by character, and the description resolves from a staggered blur. Scrollbars are hidden while scrolling remains available; overscroll is disabled. The centered waitlist modal scrolls internally on short screens.

Signed-in visitors use the full-page `/dashboard`; profile/security settings are custom inline forms backed by Clerk. Signed-out visitors see the landing page.

## Marketplace prototype

`/marketplace` has a fictional preview catalog for VST3/AU plugins, drum kits, sound kits, and presets, with search, compatibility filters, and detail pages. The dashboard’s Seller studio offers account-scoped local drafts and JSON export; its Library section is an authenticated empty library. The prototype does not take payments, publish drafts, upload files, or download into the DAW. See [docs/marketplace.md](docs/marketplace.md) for the next backend and delivery boundaries.

Visit `/landing` from the dashboard to see the marketing page while signed in; its action becomes “Go to dashboard.”

## Development

```sh
bun install
bun run dev
```

## Clerk application and early access

The **development** Clerk application has been claimed and linked to the project. Its keys are in the ignored `.env.local`, with CLI state in the ignored `.clerk/` directory. Keep this application so the waitlist and eventual user accounts share an identity system.

The homepage opens Clerk's native waitlist modal. `/waitlist` is a standalone waitlist page. Clerk stores entries and handles confirmation and invitation emails. In the Clerk Dashboard, keep **Access mode → Waitlist** and email authentication enabled. Approve testers from the Waitlist section; their invitation allows them to create an account. Until then, public sign-up is restricted by Clerk. `/sign-in` uses Clerk's native flow; ordinary `/sign-up` visits redirect to `/waitlist`, while invitation tickets retain the native signup flow. `/account` requires an authenticated session and redirects to the dashboard’s Profile & security section. Until early access opens, `proxy.ts` shows signed-out visitors only the landing page, the waitlist, sign-in and sign-up, and the Terms and Privacy pages; every other page (marketplace and dashboard included) redirects them to `/`, and the navbar and footer hide their links. API routes do their own auth.

For deployment, create the production instance of the same Clerk application, configure its domain and waitlist access mode, and add its production keys to the hosting environment. `.env.example` lists the required names. Do not deploy with development keys.

## Pricing

Amarula's pricing (`lib/daw-subscription.ts`):

- **The DAW:** a free trial that makes and saves projects but doesn't reopen saved ones, and a **USD $99 lifetime license** (paid once, works offline, free 1.x updates).
- **Awma + Cloud:** USD $20/month or $200/year, with $7 of Awma usage a month; past that, Awma packs, then a lighter Awma (lite mode) until the month resets.
- **Awma packs:** USD $10 once for $6 more Awma usage, used after the allowance, kept until used.
- **Beat battles:** free with an account.

The subscription is a Clerk Billing plan. In **ama-web → Billing → Subscription plans**, create the paid user plan with those monthly and yearly prices and free trial disabled, put its ID in `CLERK_AWMA_PLAN_ID`, and set `CLERK_BILLING_ENABLED=true` when checkout is ready. The dashboard verifies the plan's currency, prices, paid status and absence of a free trial before enabling its Clerk CheckoutButton. The Standard and Extended plans from before are retired: while `CLERK_DAW_STANDARD_PLAN_ID` and `CLERK_DAW_EXTENDED_PLAN_ID` are still set, their subscribers count as Awma + Cloud; archive them in Clerk and unset those once nobody is on them.

The license and packs are one-time Stripe Checkout payments (`lib/stripe.ts`, `POST /api/checkout`), fulfilled by `POST /api/stripe/webhook` into Convex (`convex/licenses.ts`). Set `STRIPE_SECRET_KEY`, a webhook endpoint for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded` and `charge.dispute.created` (a full refund or a dispute takes the license or pack back) with its `STRIPE_WEBHOOK_SECRET`, and one-time Prices in `STRIPE_LICENSE_PRICE_ID` ($99) and `STRIPE_AWMA_PACK_PRICE_ID` ($10); checkout refuses a price that isn't the agreed one, a second license, and packs for non-subscribers. Testers get a free license with `bunx convex run licenses:comp '{"userId": "user_…"}'`.

The current Clerk API exposes listing plans but not creating them; the remote paid plan still needs to be created in the Clerk Dashboard. No price has been applied to the default Free plan.

## Unified dashboard

`/dashboard` fills the viewport and adapts ObsidianUI’s analytics window with an animated expandable icon rail, an inset rounded panel, compact status cards, and a small top bar. It contains Overview, Pricing, Library, Seller studio, and Profile & security sections. `/account`, `/subscription`, `/library`, and `/marketplace/sell` redirect to their dashboard sections. Authentication and waitlist routes remain for Clerk's flows. `/` redirects signed-in users to `/dashboard` and shows the landing page to visitors. The shared floating navbar has fixed tab and action widths, a translucent pill shape, and a sliding active-tab indicator over a separate translucent tab layer. Signed-in users get one Dashboard tab plus an Account icon matching the theme toggle. The wordmark has balanced spacing on both sides. It connects `/landing`, `/marketplace`, and `/dashboard` and includes theme and account actions. Page changes fade in over 180ms; dashboard section changes also rise slightly. The sidebar follows ObsidianUI’s 300ms dock/float behavior and staggered label transitions. It starts expanded; explicit toggles are saved per account in a one-year browser cookie and read on the server before rendering. Desktop navigation keeps it open; below 760px it floats over the content and closes after navigation, clicking the scrim, or pressing Escape. Reduced motion disables these transitions. On mobile, navigation uses small icons with accessible labels.

## Account settings

Profile & security uses inline forms rather than Clerk UserProfile: names, profile image, email verification and primary address, password changes, and active-session revocation. Sensitive changes use Clerk reverification; the current device is signed out through the sidebar. Existing connected accounts are listed. Name and password editing require the corresponding Clerk user settings to be enabled. No external provider linking, MFA enrollment, or account deletion UI is included yet.

## Desktop sign-in and Awma

The desktop app signs in with this Clerk application (OAuth device authorization) and asks `GET /api/desktop/entitlement` for the license and the subscription. Awma's requests to Claude go through `/api/awma/v1/messages`, which checks the subscription, rate limits and the monthly Awma allowance (then packs, then lite mode), and holds the Anthropic API key. See [docs/desktop.md](docs/desktop.md) for the safeguards and setup (Convex, `ANTHROPIC_API_KEY`, and the desktop OAuth application).

## Beat battles

The desktop app's beat battles (a lobby votes on a free kit, makes beats against the clock, then rates them anonymously) run on Convex behind `/api/battles/*`. See [docs/battles.md](docs/battles.md).

## Source attribution

- [Analytics Dashboard](https://www.obsidianui.dev/docs/analytics-dashboard): ObsidianUI by Atharv, used as the layout reference for Amarula’s adapted window, rail, and cards.

- [Liquid Chrome](https://reactbits.dev/backgrounds/liquid-chrome): React Bits by David Haz, adapted for non-interactive rendering and reduced motion. Its license is preserved at `components/backgrounds/LICENSE.react-bits.md`.
- [Skiper4](https://skiper-ui.com/v1/skiper4) button 2 with [Skiper26](https://skiper-ui.com/v1/skiper26) rectangle / bottom-up / blur transition: Skiper UI by gxuri, adapted to the existing theme provider with reduced motion and browser fallback. Attribution appears in the footer as required by the free component terms.
- [TextEffect](https://motion-primitives.com/docs/text-effect): Motion Primitives by Ibelick, adapted with reduced-motion support.
- [Sticky Footer](https://www.fancycomponents.dev/docs/components/blocks/sticky-footer): Fancy Components' relative-main/sticky-footer stacking pattern.

## Validation

```sh
bun run test
bun run lint
bun run typecheck
bun run build
```
