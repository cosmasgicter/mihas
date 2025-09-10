import { getCLS, getFID, getFCP, getLCP, getTTFB } from "web-vitals"

interface WebVitalsMetric {
  name: string
  value: number
  rating: "good" | "needs-improvement" | "poor"
  delta: number
  id: string
}

export function initWebVitals() {
  if (typeof window === "undefined") return

  const sendToAnalytics = (metric: WebVitalsMetric) => {
    // Send to Vercel Analytics
    if (window.va) {
      window.va("event", {
        name: metric.name,
        data: {
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
          id: metric.id,
        },
      })
    }

    // Send to custom analytics endpoint
    fetch("/api/analytics/web-vitals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metric),
    }).catch((error) => {
      console.error("Failed to send web vitals:", error)
    })
  }

  getCLS(sendToAnalytics)
  getFID(sendToAnalytics)
  getFCP(sendToAnalytics)
  getLCP(sendToAnalytics)
  getTTFB(sendToAnalytics)
}

export function trackCustomMetric(name: string, value: number, unit = "ms") {
  if (typeof window === "undefined") return

  const metric = {
    name: `custom.${name}`,
    value,
    unit,
    timestamp: Date.now(),
  }

  // Send to analytics
  fetch("/api/analytics/custom-metrics", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metric),
  }).catch((error) => {
    console.error("Failed to send custom metric:", error)
  })
}

export function measureAsyncOperation<T>(name: string, operation: () => Promise<T>): Promise<T> {
  const startTime = performance.now()

  return operation()
    .then((result) => {
      const duration = performance.now() - startTime
      trackCustomMetric(name, duration)
      return result
    })
    .catch((error) => {
      const duration = performance.now() - startTime
      trackCustomMetric(`${name}.error`, duration)
      throw error
    })
}
