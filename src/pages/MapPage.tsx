import { Alert, Container, Snackbar } from '@mui/material'
import { observer } from 'mobx-react-lite'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { MapHeader } from '../components/map/MapHeader'
import { ObjectsMap } from '../components/map/ObjectsMap'
import { useNow } from '../hooks/useNow'
import { useObjectsFeed } from '../hooks/useObjectsFeed'
import { useStores } from '../stores/StoresProvider'

export const MapPage = observer(function MapPage() {
  const { authStore, objectsStore } = useStores()
  const navigate = useNavigate()

  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isResetting, setIsResetting] = useState(false)

  const center = useMemo<[number, number]>(() => [50.4501, 30.5234], [])

  const { status: wsStatus, resetServer } = useObjectsFeed({
    apiKey: authStore.apiKey,
    objectsStore,
    center,
    mockCount: authStore.viewerCount,
    onAuthError: (message) => setToast({ type: 'error', text: message }),
  })

  const now = useNow(1000)

  const objects = objectsStore.list.map((o) => {
    const removeAfterMs = authStore.removeAfterSec * 1000
    const lostSince = o.lost ? o.lostSinceAt ?? now : null
    const removeInMs = o.lost && lostSince != null ? Math.max(0, lostSince + removeAfterMs - now) : null

    return {
      id: o.id,
      lat: o.lat,
      lng: o.lng,
      headingDeg: o.headingDeg,
      lost: o.lost,
      lastSeenAt: o.lastSeenAt,
      removeInMs,
    }
  })

  return (
    <Container maxWidth={false} sx={{ py: 2 }}>
      <MapHeader
        wsStatus={wsStatus}
        viewerCount={authStore.viewerCount}
        removeAfterSec={authStore.removeAfterSec}
        objectsCount={objectsStore.list.length}
        apiKey={authStore.apiKey}
        isResetting={isResetting}
        onLogout={() => {
          authStore.logout()
          navigate('/signin', { replace: true })
        }}
        onReset={() => {
          void (async () => {
            try {
              setIsResetting(true)
              const r = await resetServer()
              if (r.ok) {
                objectsStore.clear()
                setToast({ type: 'success', text: 'Симуляцію на сервері скинуто' })
              } else {
                setToast({ type: 'error', text: `Не вдалося скинути: ${r.error}` })
              }
            } catch {
              setToast({ type: 'error', text: 'Не вдалося скинути симуляцію' })
            } finally {
              setIsResetting(false)
            }
          })()
        }}
      />

      <ObjectsMap center={center} objects={objects} />

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.type} variant="filled" onClose={() => setToast(null)}>
            {toast.text}
          </Alert>
        ) : (
          <span />
        )}
      </Snackbar>
    </Container>
  )
})
