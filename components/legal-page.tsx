import Link from "next/link"

import { legal } from "@/lib/legal"

/** The layout of the Terms of Service and Privacy Policy. */
export function LegalPage({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <main id="main" className="legal-page">
      <article>
        <h1>{title}</h1>
        <p className="legal-meta">Effective {legal.effectiveDate}</p>
        {children}
      </article>
      <footer className="legal-footer">
        <nav aria-label="Legal">
          <Link href="/terms">Terms of Service</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <a href={`mailto:${legal.contactEmail}`}>{legal.contactEmail}</a>
        </nav>
        <PoweredByTracktion />
      </footer>
    </main>
  )
}

/** The credit Tracktion Engine's license requires wherever Amarula is presented. */
export function PoweredByTracktion() {
  return (
    <a
      className="powered-by-tracktion"
      href="https://www.tracktion.com/develop/tracktion-engine"
      target="_blank"
      rel="noopener noreferrer"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a small static badge */}
      <img
        src="/powered-by-tracktion.png"
        alt="Powered by Tracktion Engine"
        width={135}
        height={49}
      />
    </a>
  )
}
