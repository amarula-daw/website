import { ClerkProvider } from "@clerk/nextjs"
import type { Metadata } from "next"
import { Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import { SiteNavbar } from "@/components/site-navbar"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "Amarula",
  description:
    "Meet Amarula, a digital audio workstation, and Awma, your agent for making music. Join the waitlist for early access.",
  openGraph: {
    title: "Amarula",
    description:
      "A digital audio workstation and your agent for making music. Join the early access waitlist.",
    type: "website",
  },
}

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        inter.variable
      )}
    >
      <body>
        <ThemeProvider>
          <ClerkProvider
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            waitlistUrl="/waitlist"
            signInFallbackRedirectUrl="/dashboard"
            signUpFallbackRedirectUrl="/dashboard"
            appearance={{
              variables: {
                borderRadius: "0.625rem",
                fontFamily: "var(--font-inter), sans-serif",
              },
              elements: {
                modalBackdrop: {
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "24px",
                },
                modalContent: {
                  margin: "0",
                  overflowY: "auto",
                  maxHeight: "calc(100dvh - 48px)",
                  maxWidth: "100%",
                },
              },
            }}
          >
            <SiteNavbar />
            {children}
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
