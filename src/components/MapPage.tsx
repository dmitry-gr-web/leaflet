import { Alert, Box, Button, Chip, Container, Paper, Snackbar, Stack, Typography } from '@mui/material'
import 'leaflet/dist/leaflet.css'
import { observer } from 'mobx-react-lite'
import { useMemo, useState } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'

import { useLostSinceById } from '../hooks/useLostSinceById'
import { useNow } from '../hooks/useNow'
import { useObjectsFeed } from '../hooks/useObjectsFeed'
import { useStores } from '../stores/StoresProvider'
import { ObjectMarker } from './ObjectMarker'

export const MapPage = observer(function MapPage() {
  const { authStore, objectsStore } = useStores()

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
  const lostSinceById = useLostSinceById(
    objectsStore.list.map((o) => ({ id: o.id, lost: o.lost })),
    now,
  )

  return (
    <Container maxWidth={false} sx={{ py: 2 }}>
      <Stack
        direction="row"
        spacing={2}
        sx={{
          mb: 2,
          alignItems: 'center',
          flexWrap: 'wrap',
          rowGap: 1,
        }}
      >
        <Typography variant="h6" sx={{ flex: 1, minWidth: 220 }}>
          Трекінг об’єктів
        </Typography>
        <Chip label={`WS: ${wsStatus}`} variant="outlined" />
        <Chip label={`Ліміт: ${authStore.viewerCount}`} variant="outlined" />
        <Chip label={`Видалення: ${authStore.removeAfterSec}s`} variant="outlined" />
        <Chip label={`Об’єктів: ${objectsStore.list.length}`} />
        <Button
          size="small"
          variant="outlined"
          disabled={isResetting}
          onClick={async () => {
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
          }}
        >
          Скинути об’єкти
        </Button>
        <Chip
          color="primary"
          variant="outlined"
          label={`Ключ: ${authStore.apiKey ?? ''}`}
          onDelete={() => authStore.logout()}
        />
      </Stack>

      <Paper elevation={2} sx={{ height: 'calc(100vh - 120px)', overflow: 'hidden' }}>
        <Box sx={{ height: '100%' }}>
          <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {objectsStore.list.map((o) => {
              const removeAfterMs = authStore.removeAfterSec * 1000
              const lostSince = o.lost ? lostSinceById[o.id] ?? now : null
              const removeInMs = o.lost && lostSince != null ? Math.max(0, lostSince + removeAfterMs - now) : null

              return (
                <ObjectMarker
                  key={o.id}
                  id={o.id}
                  lat={o.lat}
                  lng={o.lng}
                  headingDeg={o.headingDeg}
                  lost={o.lost}
                  lastSeenAt={o.lastSeenAt}
                  removeInMs={removeInMs}
                />
              )
            })}
          </MapContainer>
        </Box>
      </Paper>

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
