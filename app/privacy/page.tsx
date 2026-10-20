import type { Metadata } from "next"

import { LegalPage } from "@/components/legal-page"
import { legal } from "@/lib/legal"

export const metadata: Metadata = {
  title: "Privacy Policy — Amarula",
  description:
    "What Amarula collects, why, and who it shares it with, for the app, Awma and the website.",
}

const external = (href: string, label: string) => (
  <a href={href} target="_blank" rel="noopener noreferrer">
    {label}
  </a>
)

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This policy explains what information Amarula (the app for Mac, Awma and
        this website) collects, why, and who it’s shared with. {legal.operator}{" "}
        is responsible for it. We don’t sell your information or use it for
        advertising.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your account:</strong> your name, email address, profile image
          and sign-in details, and the devices and sessions you’re signed in on.
        </li>
        <li>
          <strong>Your subscription:</strong> your plan, its billing period and
          status. Payments are handled by our payment provider; we never see or
          store your card details.
        </li>
        <li>
          <strong>Awma usage:</strong> how many requests you make and what they
          cost, to apply your monthly allowance and rate limits.
        </li>
        <li>
          <strong>What you ask Awma:</strong> your messages, and the information
          about your project Awma reads to answer them, such as track and clip
          names, notes, tempo, plugins and their settings, mixer levels, and the
          names of files in folders you’ve added to the browser. Awma doesn’t
          receive your audio.
        </li>
        <li>
          <strong>App usage analytics, if you agree:</strong> which features and
          Awma tools you use and how often they fail, how long the app takes to
          open, CPU load while playing, project size (counts of tracks, clips
          and plugins), crashes, and the app version and operating system, under
          a random ID that isn’t linked to your account. Never your projects,
          their names, file names, plugin settings or audio. The app asks first,
          and you can turn this off in Settings → Privacy, which deletes
          anything not yet sent.
        </li>
        <li>
          <strong>Website analytics:</strong> pages visited and page
          performance, collected without cookies and without identifying you.
        </li>
        <li>
          <strong>Technical logs:</strong> our hosting keeps short-lived logs of
          requests (such as IP addresses and errors) to run and secure the
          service.
        </li>
      </ul>

      <h2>What stays on your Mac</h2>
      <p>
        Your projects, recordings and settings stay on your Mac. The app keeps
        your sign-in in the macOS Keychain and remembers your last subscription
        check so it can work offline for a few days. It checks GitHub for
        updates. Bug reports and feedback open a GitHub issue in your browser,
        which is public once you submit it; diagnostics are only included if you
        choose to include them, and you can review everything before submitting.
      </p>

      <h2>How we use it</h2>
      <p>
        To provide Amarula: signing you in, checking your subscription, carrying
        out your requests to Awma, applying usage limits, preventing abuse,
        answering support requests, and improving the website. We keep no copy
        of your conversations with Awma or your project information on our
        servers; they pass through to our AI provider to answer your request.
      </p>

      <h2>Who we share it with</h2>
      <p>
        Only the service providers that run Amarula for us, each for its part of
        the service:
      </p>
      <ul>
        <li>
          {external("https://clerk.com/legal/privacy", "Clerk")}: accounts,
          sign-in and subscriptions.
        </li>
        <li>{external("https://stripe.com/privacy", "Stripe")}: payments.</li>
        <li>
          {external("https://www.anthropic.com/legal/privacy", "Anthropic")}:
          the AI behind Awma, which receives what you ask Awma and the project
          information it needs. Anthropic doesn’t use it to train its models,
          and keeps it only for a limited time under its commercial terms.
        </li>
        <li>
          {external("https://www.convex.dev/legal/privacy", "Convex")}: usage
          records, rate limits, subscription checks and app usage analytics.
        </li>
        <li>
          {external("https://vercel.com/legal/privacy-policy", "Vercel")}:
          hosting the website and its services, and website analytics.
        </li>
        <li>
          {external(
            "https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement",
            "GitHub"
          )}
          : app updates, and the bug reports and feedback you submit.
        </li>
      </ul>
      <p>
        We may also disclose information if the law requires it, or to protect
        Amarula and its users.
      </p>

      <h2>Cookies</h2>
      <p>
        The website uses cookies to keep you signed in and to remember choices
        like your theme and sidebar. It doesn’t use advertising or tracking
        cookies.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Account and subscription information is kept while you have an account.
        Awma usage records are deleted about two months after the month they
        cover. Logs are kept briefly. When you delete your account, we delete
        your information, except what we must keep for legal, tax or accounting
        reasons.
      </p>

      <h2>Your choices and rights</h2>
      <p>
        You can see and change your account details on this website, and ask us
        for a copy of your information, to correct it, or to delete your
        account, by emailing{" "}
        <a href={`mailto:${legal.contactEmail}`}>{legal.contactEmail}</a>.
        Depending on where you live (for example, in the EU, UK or California),
        you may have further rights, such as objecting to how we use your
        information or complaining to a data protection authority. We’ll respond
        within the time the law requires.
      </p>

      <h2>Where it’s processed</h2>
      <p>
        Our providers process information in the United States and other
        countries. Where the law requires, they use approved safeguards (such as
        standard contractual clauses) for international transfers.
      </p>

      <h2>Children</h2>
      <p>
        Amarula isn’t for children under 13, and we don’t knowingly collect
        their information. If you think a child has given us information,
        contact us and we’ll delete it.
      </p>

      <h2>Changes</h2>
      <p>
        If we change this policy significantly, we’ll tell you by email or in
        the app before the change takes effect.
      </p>
    </LegalPage>
  )
}
