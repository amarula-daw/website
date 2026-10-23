/**
 * Puts Amarula's own listings (lib/marketplace/seed.ts) on the marketplace,
 * in the Convex deployment NEXT_PUBLIC_CONVEX_URL points to:
 *
 *   bun scripts/marketplace-seed.ts [folder with the free products' zips]
 *
 * Images are copied into Convex storage. Free products are listed once their
 * zip (or folder, zipped here) is in the folder; unchanged files aren't
 * uploaded again. Needs CONVEX_SERVER_SECRET (.env.local is read).
 *
 * Downloads are kept within Convex's free plan (1 GB of files, and 1 GB of
 * downloads a month, shared with battle beats): a zip over MAX_DOWNLOAD_BYTES,
 * or past MAX_TOTAL_BYTES for all downloads, isn't stored, and its product is
 * taken off the marketplace (deleting a stored copy) until it's hosted
 * elsewhere.
 */
import { ConvexHttpClient } from "convex/browser"
import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, join } from "node:path"

import { api } from "../convex/_generated/api"
import type { Id } from "../convex/_generated/dataModel"
import { seedProducts } from "../lib/marketplace/seed"

const url = process.env.NEXT_PUBLIC_CONVEX_URL
const secret = process.env.CONVEX_SERVER_SECRET ?? ""
if (!url || !secret) {
  console.error("Set NEXT_PUBLIC_CONVEX_URL and CONVEX_SERVER_SECRET")
  process.exit(1)
}
const convex = new ConvexHttpClient(url)
const folder = process.argv[2]

const MB = 1024 * 1024
const MAX_DOWNLOAD_BYTES = 25 * MB
const MAX_TOTAL_BYTES = 400 * MB
/** Bytes of downloads kept so far, in listing order. */
let totalBytes = 0

/** Whether a download of this size can be stored, counting it if so. */
function fits(byteLength: number) {
  if (
    byteLength > MAX_DOWNLOAD_BYTES ||
    totalBytes + byteLength > MAX_TOTAL_BYTES
  )
    return false
  totalBytes += byteLength
  return true
}

const megabytes = (bytes: number) => `${(bytes / 1e6).toFixed(1)} MB`

const normalize = (name: string) =>
  name
    .toLowerCase()
    .replaceAll("!", "i")
    .replace(/[^a-z0-9]/g, "")

/** Uploads a file to Convex storage, trying again if the connection drops. */
async function upload(body: Blob, type: string, attempts = 3) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await uploadOnce(body, type)
    } catch (error) {
      if (attempt >= attempts) throw error
      console.warn(`Upload failed (${String(error)}), trying again`)
    }
  }
}

async function uploadOnce(body: Blob, type: string) {
  const uploadUrl = await convex.mutation(api.marketplace.generateUploadUrl, {
    secret,
  })
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "content-type": type },
    body,
  })
  if (!response.ok) throw new Error(`Upload failed: ${response.status}`)
  const { storageId } = (await response.json()) as {
    storageId: Id<"_storage">
  }
  return storageId
}

/** The zip for a product in the seed folder: a .zip, or a folder zipped now. */
async function findZip(match: string, scratch: string) {
  if (!folder) return null
  const entries = await readdir(folder)
  const name = entries.find(
    (entry) => !entry.startsWith(".") && normalize(entry).includes(match)
  )
  if (!name) return null
  const path = join(folder, name)
  if ((await stat(path)).isFile())
    return name.toLowerCase().endsWith(".zip") ? path : null
  const zip = join(scratch, `${basename(path)}.zip`)
  const ditto = spawnSync("ditto", [
    "-c",
    "-k",
    "--norsrc",
    "--keepParent",
    path,
    zip,
  ])
  if (ditto.status !== 0) throw new Error(`Couldn't zip ${path}`)
  return zip
}

const scratch = await mkdtemp(join(tmpdir(), "marketplace-seed-"))
try {
  for (const [index, seed] of seedProducts.entries()) {
    const { imageUrl, storeUrl, download, ...fields } = seed
    const existing = await convex.query(api.marketplace.files, {
      secret,
      slug: seed.slug,
    })

    let image: Id<"_storage"> | undefined
    if (imageUrl && !existing?.hasImage) {
      const response = await fetch(imageUrl)
      if (response.ok)
        image = await upload(
          await response.blob(),
          response.headers.get("content-type") ?? "image/png"
        )
      else console.warn(`${seed.slug}: image ${response.status}, skipped`)
    }

    let artifacts
    let published = true
    if (download) {
      const zip = await findZip(download.match, scratch)
      const size = zip ? (await stat(zip)).size : 0
      if (zip && fits(size)) {
        const bytes = new Uint8Array(await readFile(zip))
        const sha256 = createHash("sha256").update(bytes).digest("hex")
        const same = existing?.artifacts.find((item) => item.sha256 === sha256)
        artifacts = [
          {
            platform: download.platform ?? ("any" as const),
            install: download.install,
            storageId:
              same?.storageId ??
              (await upload(new Blob([bytes]), "application/zip")),
            fileName: `${seed.slug}.zip`,
            byteLength: bytes.byteLength,
            sha256,
          },
        ]
        console.log(
          `${seed.slug}: ${same ? "unchanged" : "uploaded"} ${basename(zip)} (${megabytes(bytes.byteLength)})`
        )
      } else {
        if (zip)
          console.log(
            `${seed.slug}: ${basename(zip)} (${megabytes(size)}) is too big to store in Convex`
          )
        // Keeps what's stored if it still fits; listed once there's something to download.
        const kept = zip
          ? []
          : (existing?.artifacts ?? []).filter((item) => fits(item.byteLength))
        if (kept.length !== (existing?.artifacts.length ?? 0)) {
          artifacts = kept
          console.log(`${seed.slug}: removed stored downloads that don't fit`)
        }
        published = kept.length > 0
        if (!published) console.log(`${seed.slug}: no download, not listed`)
      }
    }

    await convex.mutation(api.marketplace.upsert, {
      secret,
      product: {
        ...fields,
        effectTypes: fields.effectTypes ?? [],
        purchase: storeUrl
          ? { kind: "external", url: storeUrl }
          : { kind: "free" },
        published,
        sortOrder: index,
        sellerId: null,
      },
      ...(image ? { image } : {}),
      ...(artifacts ? { artifacts } : {}),
    })
    console.log(`${seed.slug}: ${published ? "listed" : "saved"}`)
  }
} finally {
  await rm(scratch, { recursive: true, force: true })
}
