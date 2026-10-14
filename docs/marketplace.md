# Marketplace foundation

## Implemented

- **Catalog in Convex** (`convex/marketplace.ts`): `products` (listing fields, image and downloads in Convex file storage, `purchase` = free or an external store URL, `sellerId` for future sellers) and `library` (what each user has gotten). Functions are secret-gated like the rest (`CONVEX_SERVER_SECRET`).
- **Amarula's own listings** live in `lib/marketplace/seed.ts` and are pushed with `bun scripts/marketplace-seed.ts [folder of zips]` (uses `.env.local`'s Convex URL and secret). Images are copied into storage. A free product is listed once its zip (or folder, zipped by the script) is in the folder; unchanged files aren't re-uploaded.
- `/marketplace` and `/marketplace/[slug]` read the catalog. Paid products link to their maker's store; free ones point to the app.
- **Desktop API:** `GET /api/marketplace/products` (public catalog) and `POST /api/marketplace/products/:slug/download { platform }` → `{ url, sha256, byteLength, install, … }` for free products. With the app's Clerk OAuth token the product is added to the user's library; without one it still downloads.
- The desktop app (`marketplace.*` host commands) verifies size and SHA-256, unzips (refusing entries outside the target) and moves kits into `~/Music/Amarula/Marketplace/<Title>` (a browser folder) or `.vst3`/`.component` bundles into `~/Library/Audio/Plug-Ins`. Nothing in a download is executed; installers (`.pkg`) aren't supported.
- `/dashboard?section=seller` drafts are still local-only.

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
