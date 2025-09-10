"use client"

import { useEffect, useRef, useState } from "react"
import { getTurnstileConfig } from "@/lib/security/turnstile"

interface TurnstileWidgetProps {
  onVerify: (token: string) => void
  onError?: () => void
  onExpire?: () => void
  className?: string
}

declare global {
  interface Window {
    turnstile: {
      render: (element: HTMLElement, options: any) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

export function TurnstileWidget({ onVerify, onError, onExpire, className }: TurnstileWidgetProps) {
  const ref = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string>()
  const [config, setConfig] = useState<{ enabled: boolean; siteKey?: string } | null>(null)

  useEffect(() => {
    getTurnstileConfig().then(setConfig)
  }, [])

  useEffect(() => {
    if (!config?.enabled) {
      console.warn("Turnstile is not enabled or configured")
      return
    }

    console.warn("Turnstile widget disabled - site key configuration needed")
    return

    // The following code would be used once proper site key configuration is implemented:
    /*
    const loadTurnstile = () => {
      if (window.turnstile && ref.current && config.siteKey) {
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: config.siteKey,
          callback: onVerify,
          "error-callback": onError,
          "expired-callback": onExpire,
          theme: "light",
          size: "normal",
        })
      }
    }

    if (window.turnstile) {
      loadTurnstile()
    } else {
      const script = document.createElement("script")
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"
      script.async = true
      script.defer = true
      script.onload = loadTurnstile
      document.head.appendChild(script)
    }

    return () => {
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current)
      }
    }
    */
  }, [config, onVerify, onError, onExpire])

  if (!config?.enabled) {
    return (
      <div
        className={className}
        style={{
          minHeight: "65px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f5f5",
          border: "1px dashed #ccc",
          borderRadius: "4px",
        }}
      >
        <span style={{ color: "#666", fontSize: "14px" }}>Turnstile verification disabled</span>
      </div>
    )
  }

  return <div ref={ref} className={className} />
}
