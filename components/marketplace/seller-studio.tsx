"use client"

import { useMemo, useState, useSyncExternalStore } from "react"
import {
  categories,
  platforms,
  formatPrice,
  type Category,
  type ProductFormat,
  type Platform,
} from "@/lib/marketplace/catalog"
import {
  parseDrafts,
  listingConfigurationError,
  type DraftListing,
} from "@/lib/marketplace/drafts"

const updateEvent = "amarula-marketplace-drafts"
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback)
  window.addEventListener(updateEvent, callback)
  return () => {
    window.removeEventListener("storage", callback)
    window.removeEventListener(updateEvent, callback)
  }
}

export function SellerStudio({ userId }: { userId: string }) {
  const storageKey = `amarula:marketplace:drafts:v1:${userId}`
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(storageKey)
      } catch {
        return null
      }
    },
    () => null
  )
  const drafts = useMemo(() => parseDrafts(raw), [raw])
  const [category, setCategory] = useState<Category>("Plugins")
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const formatOptions: ProductFormat[] =
    category === "Plugins"
      ? ["VST3", "AU"]
      : category === "Presets"
        ? ["Preset"]
        : ["WAV"]

  function persist(next: DraftListing[]) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next))
      window.dispatchEvent(new Event(updateEvent))
      setError("")
      return true
    } catch {
      setError(
        "Your browser couldn’t save this draft. Allow local storage or free up space and try again."
      )
      setStatus("")
      return false
    }
  }

  function saveDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus("")
    setError("")
    const form = event.currentTarget
    const data = new FormData(form)
    const title = String(data.get("title") ?? "").trim()
    const description = String(data.get("description") ?? "").trim()
    const priceCents = Math.round(Number(data.get("price")) * 100)
    const selectedFormats = data.getAll("formats") as ProductFormat[]
    const selectedPlatforms = data.getAll("platforms") as Platform[]
    const requires = String(data.get("requires") ?? "").trim()
    if (
      !title ||
      !description ||
      !Number.isSafeInteger(priceCents) ||
      priceCents < 0 ||
      !selectedFormats.length ||
      !selectedPlatforms.length
    ) {
      setError(
        "Add a title, description, valid price, format, and at least one platform."
      )
      return
    }
    const configurationError = listingConfigurationError({
      category,
      formats: selectedFormats,
      platforms: selectedPlatforms,
      requires,
    })
    if (configurationError) {
      setError(configurationError)
      return
    }
    if (drafts.length >= 100) {
      setError(
        "You’ve reached 100 local drafts. Export or remove a draft first."
      )
      return
    }
    const draft: DraftListing = {
      id: crypto.randomUUID(),
      title,
      description,
      category,
      priceCents,
      formats: selectedFormats,
      platforms: selectedPlatforms,
      requires,
      files: data
        .getAll("files")
        .filter((value): value is File => value instanceof File && !!value.name)
        .map((file) => ({ name: file.name, size: file.size })),
      updatedAt: new Date().toISOString(),
    }
    if (persist([draft, ...drafts])) {
      form.reset()
      setCategory("Plugins")
      setStatus("Draft saved in this browser. It hasn’t been published.")
    }
  }

  function exportDraft(draft: DraftListing) {
    const blob = new Blob(
      [JSON.stringify({ schemaVersion: 1, state: "draft", ...draft }, null, 2)],
      { type: "application/json" }
    )
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `amarula-listing-${draft.id}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <>
      <p className="seller-local-note">
        Drafts stay in this browser for your account. File names and sizes are
        saved; files are not uploaded. Publishing and payments aren’t open yet.
      </p>
      <div className="seller-layout">
        <form className="seller-form" onSubmit={saveDraft}>
          <h2>New listing</h2>
          <label>
            Title
            <input
              name="title"
              required
              maxLength={100}
              placeholder="Name your plugin, kit, or preset pack"
            />
          </label>
          <label>
            Category
            <select
              name="category"
              value={category}
              onChange={(event) => setCategory(event.target.value as Category)}
            >
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Description
            <textarea
              name="description"
              required
              maxLength={2000}
              rows={4}
              placeholder="What’s included, and who is it for?"
            />
          </label>
          <label>
            Price (USD)
            <input
              name="price"
              type="number"
              min="0"
              max="99999.99"
              step="0.01"
              required
              placeholder="0.00"
            />
          </label>
          <fieldset key={category}>
            <legend>Formats</legend>
            <div className="seller-checks">
              {formatOptions.map((format, index) => (
                <label key={format}>
                  <input
                    name="formats"
                    type="checkbox"
                    value={format}
                    defaultChecked={index === 0}
                  />
                  {format}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Platforms</legend>
            <div className="seller-checks">
              {platforms.map((platform, index) => (
                <label key={platform}>
                  <input
                    name="platforms"
                    type="checkbox"
                    value={platform}
                    defaultChecked={index === 0}
                  />
                  {platform}
                </label>
              ))}
            </div>
          </fieldset>
          {category === "Presets" && (
            <label>
              Required plugin or instrument
              <input
                name="requires"
                required
                maxLength={120}
                placeholder="Plugin name and version"
              />
            </label>
          )}
          <label>
            Release files (optional)
            <input name="files" type="file" multiple />
            <span className="field-help">
              Only file details are kept in this prototype. Keep the originals
              on your device.
            </span>
          </label>
          <button className="waitlist-button" type="submit">
            Save draft
          </button>
          {error && (
            <p className="seller-error" role="alert">
              {error}
            </p>
          )}
          <p className="seller-status" role="status" aria-live="polite">
            {status}
          </p>
        </form>
        <section className="seller-drafts" aria-labelledby="drafts-heading">
          <h2 id="drafts-heading">
            Your drafts <span>({drafts.length})</span>
          </h2>
          {drafts.length ? (
            drafts.map((draft) => (
              <article className="seller-draft" key={draft.id}>
                <p className="product-kind">{draft.category} · Local draft</p>
                <h3>{draft.title}</h3>
                <p>{draft.description}</p>
                <p>
                  {draft.formats.join(" / ")} · {draft.platforms.join(", ")} ·{" "}
                  {formatPrice(draft.priceCents)}
                </p>
                {draft.requires && <p>Requires {draft.requires}</p>}
                <p>
                  {draft.files.length} file{" "}
                  {draft.files.length === 1 ? "entry" : "entries"}
                </p>
                <div className="draft-actions">
                  <button type="button" onClick={() => exportDraft(draft)}>
                    Export draft
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        persist(drafts.filter((item) => item.id !== draft.id))
                      )
                        setStatus("Local draft removed.")
                    }}
                  >
                    Remove draft
                  </button>
                </div>
              </article>
            ))
          ) : (
            <p className="seller-empty">
              No drafts yet. Create a listing to explore the seller workflow.
            </p>
          )}
        </section>
      </div>
    </>
  )
}
