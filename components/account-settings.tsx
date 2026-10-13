"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import {
  ProfileSettings,
  EmailSettings,
  PasswordSettings,
  SessionSettings,
} from "@/components/account-settings-sections"
import { useUser, useSession, useReverification } from "@clerk/nextjs"
import type {
  EmailAddressResource,
  SessionWithActivitiesResource,
} from "@clerk/shared/types"

function errorMessage(error: unknown) {
  if (typeof error === "object" && error && "errors" in error) {
    const errors = (
      error as { errors: { longMessage?: string; message?: string }[] }
    ).errors
    return (
      errors[0]?.longMessage ||
      errors[0]?.message ||
      "Unable to save this change. Try again."
    )
  }
  return error instanceof Error
    ? error.message
    : "Unable to save this change. Try again."
}

export function AccountSettings() {
  const { user, isLoaded } = useUser()
  const { session } = useSession()
  const [sessions, setSessions] = useState<SessionWithActivitiesResource[]>([])
  const [sessionsError, setSessionsError] = useState("")
  const [pendingEmail, setPendingEmail] = useState<EmailAddressResource | null>(
    null
  )
  const [busy, setBusy] = useState(false)
  const guard = useRef(false)
  const [feedback, setFeedback] = useState({ text: "", error: false })
  const sensitive = useReverification(
    async (operation: () => Promise<unknown>) => operation()
  )

  useEffect(() => {
    let cancelled = false
    if (user)
      user
        .getSessions()
        .then((value) => {
          if (!cancelled) setSessions(value)
        })
        .catch((error) => {
          if (!cancelled) setSessionsError(errorMessage(error))
        })
    return () => {
      cancelled = true
    }
  }, [user])

  async function run(operation: () => Promise<unknown>, message: string) {
    if (guard.current) return false
    guard.current = true
    setBusy(true)
    setFeedback({ text: "", error: false })
    try {
      await operation()
      setFeedback({ text: message, error: false })
      return true
    } catch (error) {
      setFeedback({ text: errorMessage(error), error: true })
      return false
    } finally {
      guard.current = false
      setBusy(false)
    }
  }

  if (!isLoaded || !user)
    return <p className="dashboard-muted">Loading account settings…</p>

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    await run(
      () =>
        user!.update({
          firstName: String(data.get("firstName")).trim(),
          lastName: String(data.get("lastName")).trim(),
        }),
      "Profile saved."
    )
  }
  async function addEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const email = String(new FormData(form).get("email")).trim()
    const ok = await run(async () => {
      const address =
        user!.emailAddresses.find(
          (item) => item.emailAddress.toLowerCase() === email.toLowerCase()
        ) ||
        ((await sensitive(() =>
          user!.createEmailAddress({ email })
        )) as EmailAddressResource)
      await address.prepareVerification({ strategy: "email_code" })
      setPendingEmail(address)
      await user!.reload()
    }, "Verification code sent. Check your email.")
    if (ok) form.reset()
  }
  async function verifyEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const code = String(new FormData(event.currentTarget).get("code"))
    await run(async () => {
      const address = await pendingEmail!.attemptVerification({ code })
      if (address.verification.status !== "verified")
        throw new Error("Email verification is incomplete.")
      await user!.reload()
      setPendingEmail(null)
    }, "Email verified.")
  }
  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    if (data.get("newPassword") !== data.get("confirmPassword")) {
      setFeedback({ text: "The new passwords don’t match.", error: true })
      return
    }
    const ok = await run(
      () =>
        sensitive(() =>
          user!.updatePassword({
            currentPassword: user!.passwordEnabled
              ? String(data.get("currentPassword"))
              : undefined,
            newPassword: String(data.get("newPassword")),
            signOutOfOtherSessions: true,
          })
        ),
      "Password saved. Other sessions have been signed out."
    )
    if (ok) {
      form.reset()
      setSessions((previous) =>
        previous.filter((item) => item.id === session?.id)
      )
    }
  }

  return (
    <div className="account-settings" aria-busy={busy}>
      <p
        className={
          feedback.error
            ? "settings-feedback settings-error"
            : "settings-feedback"
        }
        role={feedback.error ? "alert" : "status"}
      >
        {feedback.text}
      </p>
      <ProfileSettings
        user={user}
        busy={busy}
        run={run}
        saveProfile={saveProfile}
      />
      <EmailSettings
        user={user}
        busy={busy}
        run={run}
        sensitive={sensitive}
        pendingEmail={pendingEmail}
        setPendingEmail={setPendingEmail}
        addEmail={addEmail}
        verifyEmail={verifyEmail}
      />
      <PasswordSettings user={user} busy={busy} savePassword={savePassword} />
      <SessionSettings
        busy={busy}
        run={run}
        sensitive={sensitive}
        sessions={sessions}
        sessionsError={sessionsError}
        sessionId={session?.id}
        setSessions={setSessions}
      />
      {user.externalAccounts.length > 0 && (
        <section className="settings-card">
          <header>
            <h2>Connected accounts</h2>
          </header>
          <div className="settings-rows">
            {user.externalAccounts.map((account) => (
              <div className="settings-row" key={account.id}>
                <div>
                  <p>{account.provider.replace("oauth_", "")}</p>
                  <span>{account.emailAddress}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
