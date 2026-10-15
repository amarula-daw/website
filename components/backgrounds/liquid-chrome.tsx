"use client"

// React wrapper for React Bits Liquid Chrome; license in LICENSE.react-bits.md.
import { useEffect, useRef, useState } from "react"
import {
  createLiquidChromeRenderer,
  clamp,
  parseColor,
} from "./liquid-chrome-renderer"
import type { LiquidChromeProps, Settings } from "./liquid-chrome-renderer"

const LiquidChrome = ({
  color = "#ffffff",
  speed = 0.2,
  amplitude = 0.3,
  frequencyX = 3,
  frequencyY = 3,
  detail = 4,
  thickness = 1,
  depth = 1,
  roughness = 0.3,
  exposure = 1,
  interactive = true,
  rippleStrength = 1,
  rippleSize = 1,
  tilt = 1,
  intro = true,
  lightMode = false,
  maxDevicePixelRatio = 2,
  className = "",
  style,
}: LiquidChromeProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wakeRef = useRef<(() => void) | null>(null)
  const [generation, setGeneration] = useState(0)

  const settings: Settings = {
    tint: parseColor(color).map((channel) => Math.pow(channel, 2.2)),
    speed: Math.max(0, speed),
    amplitude: clamp(amplitude, 0, 2),
    frequency: [Math.max(0.1, frequencyX), Math.max(0.1, frequencyY)],
    detail: clamp(Math.round(detail), 1, 8),
    thickness: clamp(thickness, 0.25, 4),
    depth: Math.max(0, depth),
    roughness: clamp(roughness, 0, 1),
    exposure: Math.max(0, exposure),
    interactive,
    rippleStrength: Math.max(0, rippleStrength),
    rippleSize: clamp(rippleSize, 0.2, 4),
    tilt: Math.max(0, tilt),
    intro,
    light: lightMode,
    maxRatio: clamp(maxDevicePixelRatio, 0.5, 3),
  }
  const settingsRef = useRef(settings)

  useEffect(() => {
    settingsRef.current = settings
    wakeRef.current?.()
  })

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return
    return createLiquidChromeRenderer(
      container,
      canvas,
      settingsRef,
      wakeRef,
      generation,
      () => setGeneration((value) => value + 1)
    )
  }, [generation])

  return (
    <div
      ref={containerRef}
      className={`liquid-chrome${className ? ` ${className}` : ""}`}
      style={style}
    >
      <canvas
        ref={canvasRef}
        className="liquid-chrome__canvas"
        aria-hidden="true"
      />
    </div>
  )
}

export default LiquidChrome
