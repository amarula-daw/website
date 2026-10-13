import Link from "next/link"

// Fancy Components' sticky-footer pattern: main is above a bottom-sticky footer.
// https://www.fancycomponents.dev/docs/components/blocks/sticky-footer
export function StickyFooter() {
  return (
    <footer id="footer" className="sticky-footer">
      <div className="footer-details">
        <div className="footer-status">
          <p>Amarula Status: Closed Alpha</p>
          <p>Marketplace Status: In Development</p>
        </div>
        <nav aria-label="Footer">
          <Link href="/waitlist">Early access</Link>
          <Link href="/dashboard">Your account</Link>
          <Link href="/marketplace">Marketplace</Link>
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
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Amarula</span>
          <a href="#main">Back to top ↑</a>
        </div>
      </div>
    </footer>
  )
}
