import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createMockStream } from '../api/mockServer'
import { connectObjectsWs } from '../api/wsClient'
import { LOST_STALE_MS as DEFAULT_LOST_STALE_MS } from '../constants/app'
import type { ObjectsStore } from '../stores/rootStore'
import { useStores } from '../stores/StoresProvider'

export type FeedStatus = 'connecting' | 'open' | 'closed' | 'error' | 'mock'

export function useObjectsFeed(opts: {
  apiKey: string | null
  objectsStore: ObjectsStore
  center: [number, number]
  mockCount?: number
  onAuthError?: (message: string) => void
}) {
  const { apiKey, center } = opts
  const { authStore } = useStores()

  // мок: 100..200 (можна перевизначити)
  const mockCount = useMemo(() => opts.mockCount ?? Math.floor(100 + Math.random() * 101), [opts.mockCount])
  const stream = useMemo(() => createMockStream({ center, count: mockCount }), [center, mockCount])

  const wsUrl = import.meta.env.VITE_WS_URL as string | undefined

  const [status, setStatus] = useState<FeedStatus>('closed')
  const connRef = useRef<{ close: () => void } | null>(null)

  // тримаємо актуальний store без тригера перезапуску ефекту
  const objectsStoreRef = useRef<ObjectsStore>(opts.objectsStore)
  objectsStoreRef.current = opts.objectsStore

  // Коли об’єкт вважаємо "lost": фіксований поріг (stale), не пов’язаний з removeAfterSec.
  const markLostMs = DEFAULT_LOST_STALE_MS

  // Коли видаляємо втрачені об’єкти: користувацький таймаут
  const removeAfterLostMs = Math.max(1000, (authStore.removeAfterSec ?? 300) * 1000)

  useEffect(() => {
    connRef.current?.close()
    connRef.current = null

    if (!apiKey) {
      setStatus('closed')
      return
    }

    const tick = window.setInterval(() => {
      objectsStoreRef.current.markLostIfStale(markLostMs)
      objectsStoreRef.current.prune(removeAfterLostMs)
    }, 1000)

    if (wsUrl) {
      setStatus('connecting')

      const conn = connectObjectsWs({
        url: wsUrl,
        apiKey,
        count: mockCount,
        reconnect: true,
        onObjects: (items) => {
          objectsStoreRef.current.upsertFromServer(items)
          objectsStoreRef.current.markLostIfStale(markLostMs)
          objectsStoreRef.current.prune(removeAfterLostMs)
        },
        onStatus: (s) => setStatus(s as FeedStatus),
        onClose: (ev) => {
          // eslint-disable-next-line no-console
          console.warn('WS закрито:', { code: ev.code, reason: ev.reason, wasClean: ev.wasClean })

          // 1008 = порушення політики (unauthorized)
          if (ev.code === 1008) {
            opts.onAuthError?.('Невірний ключ доступу')
            authStore.logout()
          }
        },
        onError: (err) => {
          // eslint-disable-next-line no-console
          console.error('Помилка WS:', err)

          if (err instanceof Error && err.message === 'unauthorized') {
            opts.onAuthError?.('Невірний ключ доступу')
            authStore.logout()
          }
        },
      })

      connRef.current = conn

      return () => {
        window.clearInterval(tick)
        conn.close()
        connRef.current = null
      }
    }

    setStatus('mock')
    const poll = window.setInterval(() => {
      const data = stream.tick()
      objectsStoreRef.current.upsertFromServer(data)
      objectsStoreRef.current.markLostIfStale(markLostMs)
      objectsStoreRef.current.prune(removeAfterLostMs)
    }, 1000)

    return () => {
      window.clearInterval(tick)
      window.clearInterval(poll)
    }
  }, [apiKey, stream, wsUrl, authStore, markLostMs, mockCount, removeAfterLostMs])

  const resetServer = useCallback(async () => {
    if (!apiKey) return { ok: false as const, error: 'no-apiKey' as const }

    const resetBase = (import.meta.env.VITE_RESET_URL_BASE as string | undefined) ?? null

    // Якщо задано базу — це прод/окремий сервер.
    // Інакше завжди використовуємо same-origin '/reset' (Vite proxy у деві).
    const baseUrl = resetBase ? `${resetBase.replace(/\/$/, '')}` : ''
    const url = `${baseUrl}/reset?count=${encodeURIComponent(String(mockCount))}`

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
      },
    })
    if (!res.ok) return { ok: false as const, error: `http-${res.status}` as const }
    return { ok: true as const }
  }, [apiKey, mockCount])

  return { status, mockCount, resetServer }
}
