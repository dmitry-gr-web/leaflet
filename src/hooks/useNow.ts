import { useEffect, useState } from 'react'

/**
 * Стабільний "тик" часу, вирівняний по межах секунд.
 * Потрібен для живого зворотного відліку (m:ss) без тремтіння.
 */
export function useNow(tickMs: number = 1000) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let intervalId: number | null = null
    let cancelled = false

    const start = () => {
      if (cancelled) return
      intervalId = window.setInterval(() => {
        const t = Date.now()
        setNow((prev) => (t - prev >= tickMs * 0.9 ? t : prev))
      }, tickMs)
    }

    const msToNextTick = tickMs - (Date.now() % tickMs)
    const timeoutId = window.setTimeout(() => {
      setNow(Date.now())
      start()
    }, msToNextTick)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
      if (intervalId != null) window.clearInterval(intervalId)
    }
  }, [tickMs])

  return now
}
