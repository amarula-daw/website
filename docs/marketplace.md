# Marketplace foundation

## Implemented prototype

- `/marketplace`: public fictional catalog with URL-based text, category, format, and platform filters.
- `/marketplace/[slug]`: preview listing details, example price, compatibility, and unavailable checkout.
- `/dashboard?section=seller`: Clerk-authenticated seller workspace (`/marketplace/sell` redirects here). Account-scoped drafts persist in local storage. Only file names and sizes are retained, never the file contents. Drafts can be exported as JSON and removed.
- `/dashboard?section=library`: authenticated empty library (`/library` redirects here); no fabricated purchases or download links.
- `/landing`: accessible even when signed in. Its action links to the dashboard for authenticated visitors and opens the waitlist otherwise.
- `/dashboard`: unified workspace; `/` redirects signed-in visitors here and shows the landing page to visitors.

The preview catalog is fixed data, separate from seller drafts. Local drafts are never published to other users. No payment, seller payout, asset upload, entitlement, deep link, or desktop download behavior has been implemented. No desktop files were changed.

## Next implementation boundaries

Choose a database and private file store before publishing. Store products, sellers, immutable releases, per-platform artifacts, orders, and entitlements on the server. Use the current Clerk user ID for ownership. A seller may edit their own drafts; public discovery returns only approved published listings. Keep seller drafts and purchase history private.

Clerk Billing is being prepared for Amarula's own subscription. A marketplace also needs seller onboarding and payouts; those are separate from the DAW subscription. Select and configure the marketplace payment provider before allowing checkout. Verified payment events create entitlements idempotently; browser redirects alone do not create ownership.

An artifact needs its own format and platform: a product offering AU and VST3 on macOS and Windows does not imply AU runs on Windows. Presets should identify the required plugin, its supported versions, and preset format. Kits should record sample format and optional tempo/key metadata. Each release should contain file sizes, SHA-256 digests, architectures where applicable, and installation instructions.

## Proposed DAW delivery contract (not an implemented API)

1. The DAW signs in using the same Clerk application/environment as the website.
2. An authenticated library endpoint lists the user's entitlements and compatible immutable release IDs.
3. An entitlement-checked download endpoint selects the requested artifact and returns a short-lived private download URL plus a manifest.
4. The DAW verifies the digest before unpacking into a staging directory. Kits/presets are imported into the appropriate content location. Native plugin installation follows the user's chosen destination and the platform's installation requirements; downloading does not silently execute or install a binary.
5. Installation state stays local to the DAW; order and entitlement state remain authoritative on the server.

Example artifact manifest shape:

```ts
type DownloadManifest = {
  schemaVersion: 1
  productId: string
  releaseId: string
  artifactId: string
  version: string
  kind: "plugin" | "drum-kit" | "sound-kit" | "preset"
  format: string
  platform: "macOS" | "Windows" | "Linux" | "any"
  architectures: string[]
  byteLength: number
  sha256: string
  downloadUrl: string
  expiresAt: string
  requires?: { pluginId: string; versionRange: string }
}
```

A website “Download into Amarula” action should only be enabled after desktop sign-in and an actual app-link handler exist. Such a link should carry a product/release reference, never a secret key, session token, or permanent download URL. The DAW obtains its own authorized manifest.
