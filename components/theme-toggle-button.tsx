"use client"

// Skiper4 button 2 + Skiper26 rectangle / bottom-up / blur transition by gxuri.
// https://skiper-ui.com/v1/skiper4 and https://skiper-ui.com/v1/skiper26
import { useId, useRef } from "react"
import { flushSync } from "react-dom"
import { useTheme } from "next-themes"

export function ThemeToggleButton() {
  const { setTheme } = useTheme()
  const clipId = useId()
  const transitioning = useRef(false)

  async function toggleTheme() {
    if (transitioning.current) return

    const dark = document.documentElement.dataset.theme === "dark"
    const switchTheme = () => setTheme(dark ? "light" : "dark")

    if (
      !document.startViewTransition ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      switchTheme()
      return
    }

    transitioning.current = true
    try {
      const transition = document.startViewTransition(() => {
        flushSync(switchTheme)
      })
      await transition.finished
    } catch {
      // A hidden tab or interrupted snapshot can cancel the transition.
      switchTheme()
    } finally {
      transitioning.current = false
    }
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label="Toggle light and dark theme"
      title="Toggle light and dark theme"
    >
      <svg
        viewBox="0 0 32 32"
        fill="currentColor"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <defs>
          <clipPath id={clipId}>
            <path
              className="theme-toggle-mask"
              d="M0-5h30a1 1 0 0 0 9 13v24H0Z"
            />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <circle className="theme-toggle-disc" cx="16" cy="16" r="8" />
          <g
            className="theme-toggle-rays"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M16 5.5v-4" />
            <path d="M16 30.5v-4" />
            <path d="M1.5 16h4" />
            <path d="M26.5 16h4" />
            <path d="m23.4 8.6 2.8-2.8" />
            <path d="m5.7 26.3 2.9-2.9" />
            <path d="m5.8 5.8 2.8 2.8" />
            <path d="m23.4 23.4 2.9 2.9" />
          </g>
        </g>
      </svg>
    </button>
  )
}
