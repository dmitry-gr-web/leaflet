import { useEffect, useState } from 'react'
import { connectObjectsWs } from '../api/wsClient'
import type { AuthStore } from '../stores/rootStore'

export function useAuthGate(opts: { authStore: AuthStore }) {
  const { authStore } = opts

  const wsUrl = import.meta.env.VITE_WS_URL as string | undefined
  const apiKey = authStore.apiKey

  const [authChecked, setAuthChecked] = useState(false)
  const [authOk, setAuthOk] = useState(false)
  const [authMessage, setAuthMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!apiKey) {
      setAuthMessage(null)
      setAuthOk(false)
      setAuthChecked(true)
      return
    }

    if (!wsUrl) {
      authStore.logout()
      setAuthMessage('WS URL не налаштовано (VITE_WS_URL). Неможливо перевірити ключ.')
      setAuthOk(false)
      setAuthChecked(true)
      return
    }

    setAuthChecked(false)
    setAuthMessage(null)

    void (async () => {
      const ok = await new Promise<boolean>((resolve) => {
        let done = false
        let gotData = false
        let timeoutId: number | null = null

        const finish = (v: boolean) => {
          if (done) return
          done = true
          if (timeoutId != null) {
            window.clearTimeout(timeoutId)
            timeoutId = null
          }
          resolve(v)
        }

        const conn = connectObjectsWs({
          url: wsUrl,
          apiKey,
          reconnect: false,
          onObjects: () => {
            gotData = true
            conn.close()
            finish(true)
          },
          onStatus: () => {
            // ігноруємо
          },
          onClose: () => {
            if (!done && !gotData) finish(false)
          },
          onError: (err) => {
            if (err instanceof Error && err.message === 'unauthorized') {
              finish(false)
              return
            }
            finish(false)
          },
        })

        timeoutId = window.setTimeout(() => {
          try {
            conn.close()
          } catch {
            // ігноруємо
          }
          finish(false)
        }, 3000)
      })

      if (cancelled) return

      if (!ok) {
        authStore.logout()
        setAuthMessage('Невірний ключ або сервер недоступний')
        setAuthOk(false)
        setAuthChecked(true)
        return
      }

      setAuthOk(true)
      setAuthChecked(true)
    })()

    return () => {
      cancelled = true
    }
  }, [apiKey, wsUrl, authStore])

  return { authChecked, authOk, authMessage }
}
