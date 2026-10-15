import Link from "next/link"
import { auth } from "@clerk/nextjs/server"

import { PoweredByTracktion } from "@/components/legal-page"

// Fancy Components' sticky-footer pattern: main is above a bottom-sticky footer.
// https://www.fancycomponents.dev/docs/components/blocks/sticky-footer
export async function StickyFooter() {
  const { userId } = await auth()
  return (
    <footer id="footer" className="sticky-footer">
      <div className="footer-details">
        <div className="footer-status">
          <p>Amarula Status: Closed Alpha</p>
          <p>Marketplace Status: In Development</p>
        </div>
        <nav aria-label="Footer">
          <Link href="/waitlist">Early access</Link>
          {userId ? (
            <>
              <Link href="/dashboard">Your account</Link>
              <Link href="/marketplace">Marketplace</Link>
            </>
          ) : (
            <Link href="/sign-in">Sign in</Link>
          )}
          <a
            href="https://skiper-ui.com/v1/skiper4"
            target="_blank"
            rel="noopener noreferrer"
          >
            Theme toggle by Skiper UI
          </a>
          <a
            href="https://github.com/amarula-daw/releases"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub releases
          </a>
        </nav>
        <PoweredByTracktion />
        <div className="footer-bottom">
          <span>
            <Link href="/terms">Terms</Link> ·{" "}
            <Link href="/privacy">Privacy</Link>
          </span>
          <span>© {new Date().getFullYear()} Amarula</span>
          <a href="#main">Back to top ↑</a>
        </div>
      </div>
    </footer>
  )
}
