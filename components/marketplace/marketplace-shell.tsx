import Link from "next/link"

export function MarketplaceShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="marketplace-shell">
      <div className="marketplace-preview" role="note">
        Marketplace preview. Paid plugins are sold by their makers; free kits
        install from the Marketplace in Amarula.
      </div>
      {children}
      <footer className="marketplace-footer">
        <span>Marketplace Status: In Development</span>
        <a
          href="https://skiper-ui.com/v1/skiper4"
          target="_blank"
          rel="noopener noreferrer"
        >
          Theme toggle by Skiper UI
        </a>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
      </footer>
    </main>
  )
}
