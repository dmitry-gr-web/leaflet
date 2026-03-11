import { CircularProgress } from '@mui/material'
import { observer } from 'mobx-react-lite'
import { useEffect, useRef, useState } from 'react'
import './App.css'
import { connectObjectsWs } from './api/wsClient'
import { LoginPage } from './components/LoginPage'
import { MapPage } from './components/MapPage'
import { useStores } from './stores/StoresProvider'

const wsUrl = import.meta.env.VITE_WS_URL as string | undefined

const App = observer(function App() {
  const { authStore } = useStores()

  const [authChecked, setAuthChecked] = useState(false)
  const [authOk, setAuthOk] = useState(false)
  const [authMessage, setAuthMessage] = useState<string | null>(null)

  // Лоадер пробної перевірки показуємо тільки для ключа, який був збережений у localStorage.
  const sawInitialApiKeyRef = useRef<boolean>(false)

  useEffect(() => {
    let cancelled = false

    const apiKey = authStore.apiKey

    // eslint-disable-next-line no-console
    console.log('[App/auth] effect', {
      apiKeyPresent: Boolean(apiKey),
      apiKeyValue: apiKey,
      wsUrl,
      sawInitialApiKey: sawInitialApiKeyRef.current,
    })

    // На старті запам’ятовуємо, чи був ключ збережений.
    if (!sawInitialApiKeyRef.current) {
      sawInitialApiKeyRef.current = Boolean(apiKey)
      // eslint-disable-next-line no-console
      console.log('[App/auth] set sawInitialApiKeyRef', { sawInitialApiKey: sawInitialApiKeyRef.current })
    }

    if (!apiKey) {
      // eslint-disable-next-line no-console
      console.log('[App/auth] no apiKey -> Login')
      setAuthMessage(null)
      setAuthOk(false)
      setAuthChecked(true)
      return
    }

    if (!wsUrl) {
      // eslint-disable-next-line no-console
      console.log('[App/auth] no wsUrl -> allow (mock mode)')
      setAuthMessage(null)
      setAuthOk(true)
      setAuthChecked(true)
      return
    }

    if (!sawInitialApiKeyRef.current) {
      // eslint-disable-next-line no-console
      console.log('[App/auth] apiKey is not initial (from login) -> allow without probe')
      setAuthMessage(null)
      setAuthOk(true)
      setAuthChecked(true)
      return
    }

    // eslint-disable-next-line no-console
    console.log('[App/auth] start probe for saved apiKey')

    setAuthChecked(false)
    setAuthMessage(null)

    void (async () => {
      const ok = await new Promise<boolean>((resolve) => {
        let done = false
        let opened = false
        let gotData = false
        let timeoutId: number | null = null

        const finish = (v: boolean, reason?: string) => {
          if (done) return
          done = true
          if (timeoutId != null) {
            window.clearTimeout(timeoutId)
            timeoutId = null
          }
          // eslint-disable-next-line no-console
          console.log('[App/auth] probe finish', { ok: v, opened, gotData, reason })
          resolve(v)
        }

        const conn = connectObjectsWs({
          url: wsUrl,
          apiKey,
          reconnect: false,
          onObjects: (items) => {
            gotData = true
            // eslint-disable-next-line no-console
            console.log('[App/auth] probe got objects', { count: items.length })
            conn.close()
            finish(true, 'got-objects')
          },
          onStatus: (s) => {
            // eslint-disable-next-line no-console
            console.log('[App/auth] probe status', s)
            if (s === 'open') {
              opened = true
              // важливо: НЕ finish тут. чекаємо objects або unauthorized
            }
          },
          onClose: (ev) => {
            // eslint-disable-next-line no-console
            console.log('[App/auth] probe close', { code: ev.code, reason: ev.reason, wasClean: ev.wasClean, opened, gotData })
            if (!done && !gotData) finish(false, `close-${ev.code}`)
          },
          onError: (err) => {
            // eslint-disable-next-line no-console
            console.log('[App/auth] probe error', err)
            if (err instanceof Error && err.message === 'unauthorized') {
              finish(false, 'unauthorized')
              return
            }
            finish(false, 'error')
          },
        })

        timeoutId = window.setTimeout(() => {
          // eslint-disable-next-line no-console
          console.log('[App/auth] probe timeout')
          try {
            conn.close()
          } catch {
            // ігноруємо
          }
          finish(false, 'timeout')
        }, 3000)
      })

      if (cancelled) {
        // eslint-disable-next-line no-console
        console.log('[App/auth] probe cancelled')
        return
      }

      if (!ok) {
        // eslint-disable-next-line no-console
        console.log('[App/auth] probe failed -> logout + Login', { authMessage: 'Невірний ключ або сервер недоступний' })
        authStore.logout()
        setAuthMessage('Невірний ключ або сервер недоступний')
        setAuthOk(false)
        setAuthChecked(true)
        return
      }

      // eslint-disable-next-line no-console
      console.log('[App/auth] probe ok -> Map')
      setAuthOk(true)
      setAuthChecked(true)
    })()

    return () => {
      // eslint-disable-next-line no-console
      console.log('[App/auth] cleanup -> cancelled')
      cancelled = true
    }
  }, [authStore, authStore.apiKey])

  if (!authChecked) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', fontFamily: 'system-ui', gap: 12 }}>
        <CircularProgress size={28} />
        <div>Перевірка ключа…</div>
      </div>
    )
  }

  if (!authOk) return <LoginPage initialError={authMessage} />
  return <MapPage />
})

export default App
