export type WsObjectDto = {
  id: string
  lat: number
  lng: number
  headingDeg: number
}

export type WsMessage =
  | { type: 'objects'; items: WsObjectDto[] }
  | { type: 'ping' }
  | { type: 'error'; message: string }

export type WsClientOptions = {
  url: string
  apiKey: string
  count?: number
  onObjects: (items: WsObjectDto[]) => void
  onStatus?: (status: 'connecting' | 'open' | 'closed' | 'error') => void
  onClose?: (ev: CloseEvent) => void
  onError?: (err: unknown) => void
  reconnect?: boolean
}

export function connectObjectsWs(opts: WsClientOptions) {
  const u = new URL(opts.url)
  u.searchParams.set('key', opts.apiKey)
  if (typeof opts.count === 'number' && Number.isFinite(opts.count) && opts.count > 0) {
    u.searchParams.set('count', String(Math.floor(opts.count)))
  }

  let ws: WebSocket | null = null
  let closedByClient = false
  let reconnectAttempt = 0
  let reconnectTimer: number | null = null
  let generation = 0

  const clearReconnectTimer = () => {
    if (reconnectTimer != null) {
      window.clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  const scheduleReconnect = (gen: number) => {
    if (closedByClient || !opts.reconnect) return
    reconnectAttempt += 1
    const delay = Math.min(2000 * reconnectAttempt, 10_000)
    clearReconnectTimer()
    reconnectTimer = window.setTimeout(() => {
      if (closedByClient || gen !== generation) return
      open()
    }, delay)
  }

  const open = () => {
    const myGen = ++generation
    clearReconnectTimer()

    opts.onStatus?.('connecting')

    const next = new WebSocket(u.toString())
    ws = next

    let opened = false

    next.onopen = () => {
      if (closedByClient || myGen !== generation) {
        try {
          next.close()
        } catch {
          // ігноруємо
        }
        return
      }

      opened = true
      reconnectAttempt = 0
      opts.onStatus?.('open')
    }

    next.onclose = (ev) => {
      if (myGen !== generation) return
      opts.onStatus?.('closed')
      opts.onClose?.(ev)
      scheduleReconnect(myGen)

      // якщо сокет закрився до onopen і це НЕ закриття клієнтом,
      // onerror у Chrome може кидати "closed before established" — гасимо це,
      // бо причина вже в onclose.
      if (!opened && !closedByClient && ev.code === 1006) {
        // нічого
      }
    }

    next.onerror = (e) => {
      if (myGen !== generation) return
      // якщо інстанс вже закритий клієнтом — не шумимо
      if (closedByClient) return
      opts.onStatus?.('error')
      opts.onError?.(e)
    }

    next.onmessage = (ev) => {
      if (closedByClient || myGen !== generation) return
      try {
        const msg = JSON.parse(String(ev.data)) as WsMessage
        if (msg.type === 'objects') {
          opts.onObjects(msg.items)
        } else if (msg.type === 'error') {
          opts.onError?.(new Error(msg.message))
        }
      } catch (err) {
        opts.onError?.(err)
      }
    }
  }

  open()

  return {
    close: () => {
      closedByClient = true
      clearReconnectTimer()
      generation += 1

      if (ws) {
        try {
          ws.close(1000, 'client closing')
        } catch {
          // ігноруємо
        } finally {
          ws = null
        }
      }
    },
  }
}
