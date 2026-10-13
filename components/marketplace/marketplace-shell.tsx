export function MarketplaceShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="marketplace-shell">
      <div className="marketplace-preview" role="note">
        Marketplace preview. Example listings only; purchases and DAW downloads
        aren’t available yet.
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
      </footer>
    </main>
  )
}
