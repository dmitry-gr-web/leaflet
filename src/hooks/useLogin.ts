import { useCallback, useEffect, useMemo, useState } from 'react'
import { connectObjectsWs } from '../api/wsClient'

export function useLogin(opts: {
  initialError?: string | null
  wsUrl?: string
  onSuccess: (apiKey: string) => void
}) {
  const { initialError, wsUrl, onSuccess } = opts

  const [error, setError] = useState<string | null>(initialError ?? null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showErrorToast, setShowErrorToast] = useState(false)

  useEffect(() => {
    if (initialError) setError(initialError)
  }, [initialError])

  const canSubmit = useMemo(() => !isSubmitting, [isSubmitting])

  const tryLogin = useCallback(
    async (rawKey: string) => {
      const trimmed = rawKey.trim()
      if (!trimmed) {
        setError('Вкажіть ключ доступу')
        return false
      }

      if (!wsUrl) {
        setError('WS URL не налаштовано (VITE_WS_URL). Неможливо перевірити ключ.')
        return false
      }

      setShowSuccess(false)
      setIsSubmitting(true)

      try {
        const ok = await new Promise<boolean>((resolve) => {
          let done = false
          let opened = false
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
            apiKey: trimmed,
            reconnect: false,
            onObjects: () => {
              // ignore
            },
            onStatus: (s) => {
              if (s === 'open') {
                opened = true
                conn.close()
                finish(true)
              }
            },
            onClose: () => {
              if (!opened) finish(false)
            },
            onError: () => {
              finish(false)
            },
          })

          timeoutId = window.setTimeout(() => {
            try {
              conn.close()
            } catch {
              // ignore
            }
            finish(false)
          }, 3000)
        })

        if (!ok) {
          setError('Невірний ключ або сервер недоступний')
          setShowErrorToast(true)
          return false
        }

        setError(null)
        onSuccess(trimmed)
        setShowSuccess(true)
        return true
      } catch {
        setError('Невірний ключ або сервер недоступний')
        setShowErrorToast(true)
        return false
      } finally {
        setIsSubmitting(false)
      }
    },
    [onSuccess, wsUrl],
  )

  return {
    error,
    setError,
    showSuccess,
    setShowSuccess,
    isSubmitting,
    showErrorToast,
    setShowErrorToast,
    canSubmit,
    tryLogin,
  }
}
