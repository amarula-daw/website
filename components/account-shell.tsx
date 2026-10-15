export function AccountShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="account-shell">
      <div className="account-content">{children}</div>
    </main>
  )
}
