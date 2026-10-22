import type { Metadata } from "next"
import Link from "next/link"

import { LegalPage } from "@/components/legal-page"
import { awmaPack, dawLicense, dawPlans } from "@/lib/daw-subscription"
import { legal } from "@/lib/legal"

export const metadata: Metadata = {
  title: "Terms of Service — Amarula",
  description: "The terms for using Amarula, Awma and the Amarula website.",
}

const allowance = `$${dawPlans[0]!.awmaBudgetMicros / 1_000_000}`
const licensePrice = `$${dawLicense.priceCents / 100}`
const packPrice = `$${awmaPack.priceCents / 100}`

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        These terms cover the Amarula app for Mac, Awma (the assistant built
        into it), and this website (together, “Amarula”). Amarula is offered by{" "}
        {legal.operator} (“we”, “us”). By creating an account, subscribing or
        using Amarula, you agree to these terms and to our{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>Your account</h2>
      <p>
        You need an account to buy a license, subscribe, play beat battles or
        use Awma; the free trial doesn’t need one. Keep your sign-in details
        secure; you’re responsible for what happens under your account. You must
        be at least 13 years old, and old enough to agree to these terms where
        you live; if you’re under 18, a parent or guardian must agree to them
        for you and manage the subscription. Accounts are for one person and
        can’t be shared or transferred.
      </p>

      <h2>Licenses, subscriptions and billing</h2>
      <ul>
        <li>
          The Amarula app has a free trial, which can make and save projects but
          not reopen saved ones. A license ({licensePrice}, paid once) unlocks
          the app for good, including offline, with free updates for version 1.
        </li>
        <li>
          The Awma + Cloud subscription covers Awma and the online features that
          need our servers. It’s billed monthly or yearly, at the price shown
          when you subscribe, through our payment provider, and renews
          automatically until you cancel. Beat battles are free with an account.
        </li>
        <li>
          You can cancel at any time from your account on this website. Your
          subscription then runs to the end of the period you’ve paid for, and
          isn’t renewed.
        </li>
        <li>
          Payments aren’t refundable, except where the law requires a refund. If
          we change the price, we’ll tell you before it applies, and the new
          price starts with your next billing period.
        </li>
        <li>
          The app checks your license and subscription when you sign in and
          regularly after that. Once it has found your license, the app keeps
          working without reaching us.
        </li>
      </ul>

      <h2>Using the app</h2>
      <p>
        With a license, or during the trial, we give you a personal,
        non-exclusive, non-transferable license to install and use the Amarula
        app on Macs you own or control. You may not copy, modify, reverse
        engineer, or resell the app; get around its trial, license, subscription
        or usage limits; or use Amarula to break the law or infringe anyone’s
        rights. Amarula is in early access: features may change, and you should
        keep backups of your projects.
      </p>

      <h2>Your music</h2>
      <p>
        Your projects, recordings and the music you make are yours. We don’t
        claim any rights to them. When you ask Awma to do something, the
        information it needs about your project is sent to our AI provider to
        carry out your request; see the{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>Awma</h2>
      <ul>
        <li>
          Awma uses AI provided by Anthropic. It can make mistakes and change
          your project in ways you didn’t intend, so check its work; you can
          undo its changes, and it asks before deleting your work.
        </li>
        <li>
          Your subscription includes up to {allowance} of AI usage each month,
          measured by what your requests cost us, and Awma is rate limited to
          keep the service available. Past the allowance, Awma packs (
          {`${packPrice} each`}, paid once, kept until used) add more; without
          one, Awma switches to a lighter model for a while and then stops until
          the month resets.
        </li>
        <li>
          Don’t use Awma to create content that’s illegal or harmful, or in ways
          that break{" "}
          <a
            href="https://www.anthropic.com/legal/aup"
            target="_blank"
            rel="noopener noreferrer"
          >
            Anthropic’s Usage Policy
          </a>
          .
        </li>
      </ul>

      <h2>Third-party software</h2>
      <p>
        Amarula loads the audio plugins you install, which are made and licensed
        by others; we aren’t responsible for them. Amarula is powered by
        Tracktion Engine and includes open-source software, listed in the app
        under Help → Acknowledgements.
      </p>

      <h2>Ending your use</h2>
      <p>
        You can stop using Amarula and cancel at any time. We may suspend or end
        your access if you break these terms or misuse the service. If we stop
        offering Amarula, we’ll tell you in advance and refund the unused part
        of any prepaid subscription.
      </p>

      <h2>Disclaimers and liability</h2>
      <p>
        Amarula is provided “as is” and “as available”, without warranties of
        any kind, to the extent the law allows. To the extent the law allows, we
        aren’t liable for lost data, projects, profits or any indirect or
        consequential damages, and our total liability for any claim about
        Amarula is limited to what you paid us in the 12 months before it.
        Nothing in these terms limits rights you have under consumer law that
        can’t be waived.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. If a change is significant, we’ll tell you by
        email or in the app before it takes effect; continuing to use Amarula
        after that means you accept the new terms.
      </p>

      <h2>Law and contact</h2>
      <p>
        These terms are governed by the laws of {legal.governingLaw}. Questions
        about them:{" "}
        <a href={`mailto:${legal.contactEmail}`}>{legal.contactEmail}</a>.
      </p>
    </LegalPage>
  )
}
