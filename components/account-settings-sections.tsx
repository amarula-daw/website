"use client"
import type { FormEvent, Dispatch, SetStateAction } from "react"
import type {
  UserResource,
  EmailAddressResource,
  SessionWithActivitiesResource,
} from "@clerk/shared/types"
type Run = (
  operation: () => Promise<unknown>,
  message: string
) => Promise<boolean>
type Sensitive = (operation: () => Promise<unknown>) => Promise<unknown>
type Submit = (event: FormEvent<HTMLFormElement>) => Promise<void>
type Common = { user: UserResource; busy: boolean; run: Run }
export function ProfileSettings({
  user,
  busy,
  run,
  saveProfile,
}: Common & { saveProfile: Submit }) {
  return (
    <section className="settings-card">
      <header>
        <h2>Profile</h2>
        <p>Your name and profile image.</p>
      </header>
      <form onSubmit={saveProfile} className="settings-form">
        <div className="settings-field-row">
          <label>
            First name
            <input
              name="firstName"
              autoComplete="given-name"
              defaultValue={user.firstName || ""}
              maxLength={100}
            />
          </label>
          <label>
            Last name
            <input
              name="lastName"
              autoComplete="family-name"
              defaultValue={user.lastName || ""}
              maxLength={100}
            />
          </label>
        </div>
        <label>
          Profile image
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy}
            onChange={async (event) => {
              const input = event.currentTarget
              const file = input.files?.[0]
              if (file)
                await run(
                  () => user.setProfileImage({ file }),
                  "Profile image updated."
                )
              input.value = ""
            }}
          />
        </label>
        <button type="submit" disabled={busy}>
          Save profile
        </button>
      </form>
    </section>
  )
}

export function EmailSettings({
  user,
  busy,
  run,
  sensitive,
  pendingEmail,
  setPendingEmail,
  addEmail,
  verifyEmail,
}: Common & {
  sensitive: Sensitive
  pendingEmail: EmailAddressResource | null
  setPendingEmail: Dispatch<SetStateAction<EmailAddressResource | null>>
  addEmail: Submit
  verifyEmail: Submit
}) {
  return (
    <section className="settings-card">
      <header>
        <h2>Email addresses</h2>
        <p>Verify an address before making it your primary email.</p>
      </header>
      <div className="settings-rows">
        {user.emailAddresses.map((address) => (
          <div className="settings-row" key={address.id}>
            <div>
              <p>{address.emailAddress}</p>
              <span>
                {address.id === user.primaryEmailAddressId
                  ? "Primary"
                  : address.verification.status === "verified"
                    ? "Verified"
                    : "Unverified"}
              </span>
            </div>
            <div className="settings-row-actions">
              {address.id !== user.primaryEmailAddressId &&
                address.verification.status === "verified" && (
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(
                        () =>
                          sensitive(() =>
                            user.update({ primaryEmailAddressId: address.id })
                          ),
                        "Primary email updated."
                      )
                    }
                  >
                    Make primary
                  </button>
                )}
              {address.verification.status !== "verified" && (
                <button
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await address.prepareVerification({
                        strategy: "email_code",
                      })
                      setPendingEmail(address)
                    }, "Verification code sent.")
                  }
                >
                  Verify
                </button>
              )}
              {address.id !== user.primaryEmailAddressId && (
                <button
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await sensitive(() => address.destroy())
                      if (pendingEmail?.id === address.id) setPendingEmail(null)
                      await user.reload()
                    }, "Email removed.")
                  }
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <form className="settings-inline-form" onSubmit={addEmail}>
        <label>
          New email
          <input type="email" name="email" required autoComplete="email" />
        </label>
        <button type="submit" disabled={busy}>
          Add email
        </button>
      </form>
      {pendingEmail && (
        <form className="settings-inline-form" onSubmit={verifyEmail}>
          <label>
            Code sent to {pendingEmail.emailAddress}
            <input
              name="code"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
            />
          </label>
          <button type="submit" disabled={busy}>
            Verify code
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(
                () =>
                  pendingEmail.prepareVerification({
                    strategy: "email_code",
                  }),
                "Verification code resent."
              )
            }
          >
            Resend
          </button>
        </form>
      )}
    </section>
  )
}

export function PasswordSettings({
  user,
  busy,
  savePassword,
}: Pick<Common, "user" | "busy"> & { savePassword: Submit }) {
  return (
    <section className="settings-card" id="security">
      <header>
        <h2>Password</h2>
        <p>
          {user.passwordEnabled
            ? "Update your password and sign out other sessions."
            : "Add a password to your account."}
        </p>
      </header>
      <form className="settings-form" onSubmit={savePassword}>
        {user.passwordEnabled && (
          <label>
            Current password
            <input
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
            />
          </label>
        )}
        <div className="settings-field-row">
          <label>
            New password
            <input
              name="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <label>
            Confirm new password
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
        </div>
        <button type="submit" disabled={busy}>
          {user.passwordEnabled ? "Update password" : "Add password"}
        </button>
      </form>
    </section>
  )
}

export function SessionSettings({
  busy,
  run,
  sensitive,
  sessions,
  sessionsError,
  sessionId,
  setSessions,
}: Pick<Common, "busy" | "run"> & {
  sensitive: Sensitive
  sessions: SessionWithActivitiesResource[]
  sessionsError: string
  sessionId?: string
  setSessions: Dispatch<SetStateAction<SessionWithActivitiesResource[]>>
}) {
  return (
    <section className="settings-card">
      <header>
        <h2>Active sessions</h2>
        <p>Manage devices signed into your account.</p>
      </header>
      {sessionsError && <p role="alert">{sessionsError}</p>}
      <div className="settings-rows">
        {sessions
          .filter((item) => item.status === "active")
          .map((item) => (
            <div className="settings-row" key={item.id}>
              <div>
                <p>
                  {item.latestActivity.browserName || "Browser"} ·{" "}
                  {item.latestActivity.deviceType || "Device"}
                </p>
                <span>
                  {item.id === sessionId
                    ? "This device"
                    : `Last active ${item.lastActiveAt.toISOString().slice(0, 10)}`}
                </span>
              </div>
              {item.id !== sessionId && (
                <button
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await sensitive(() => item.revoke())
                      setSessions((previous) =>
                        previous.filter((other) => other.id !== item.id)
                      )
                    }, "Session signed out.")
                  }
                >
                  Sign out device
                </button>
              )}
            </div>
          ))}
      </div>
    </section>
  )
}
