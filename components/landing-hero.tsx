"use client"

import dynamic from "next/dynamic"
import { useTheme } from "next-themes"
import { TextEffect } from "@/components/motion-primitives/text-effect"

const LiquidChrome = dynamic(
  () => import("@/components/backgrounds/liquid-chrome"),
  { ssr: false }
)

export function LandingHero() {
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === "dark"
  return (
    <main id="main" className="chrome-hero">
      <div className="chrome-background" aria-hidden="true">
        <LiquidChrome
          lightMode={!dark}
          interactive={false}
          speed={0.12}
          amplitude={0.3}
          color="#ffffff"
          intro
          maxDevicePixelRatio={1.5}
        />
      </div>
      <div className="chrome-shade" aria-hidden="true" />
      <div className="hero-content">
        <TextEffect
          as="h1"
          per="char"
          className="hero-title"
          segmentWrapperClassName="title-segment"
          speedReveal={1.5}
          variants={{
            item: {
              hidden: {
                opacity: 0,
                transform: "translateY(110%) rotate(5deg)",
              },
              visible: { opacity: 1, transform: "translateY(0%) rotate(0deg)" },
            },
          }}
          segmentTransition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        >
          Amarula
        </TextEffect>
        <TextEffect
          as="p"
          per="word"
          preset="fade-in-blur"
          className="hero-description"
          delay={0.15}
          speedReveal={2}
          variants={{
            item: {
              hidden: {
                opacity: 0,
                filter: "blur(6px)",
                transform: "translateY(12px)",
              },
              visible: {
                opacity: 1,
                filter: "blur(0px)",
                transform: "translateY(0px)",
              },
            },
          }}
          segmentTransition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
        >
          {
            "A digital audio workstation.\nWith Awma, your agent for making music."
          }
        </TextEffect>
      </div>
      <a className="scroll-hint" href="#footer" aria-label="Scroll to footer">
        Scroll to explore <span aria-hidden="true">↓</span>
      </a>
    </main>
  )
}
