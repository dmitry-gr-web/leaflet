import { Box, Paper } from '@mui/material'
import { observer } from 'mobx-react-lite'
import { MapContainer, TileLayer } from 'react-leaflet'

import { ObjectMarker } from '../ObjectMarker'

export const ObjectsMap = observer(function ObjectsMap(props: {
  center: [number, number]
  zoom?: number
  objects: Array<{
    id: string
    lat: number
    lng: number
    headingDeg: number
    lost: boolean
    lastSeenAt: number
    removeInMs: number | null
  }>
}) {
  const zoom = props.zoom ?? 12

  return (
    <Paper elevation={2} sx={{ height: 'calc(100vh - 120px)', overflow: 'hidden' }}>
      <Box sx={{ height: '100%' }}>
        <MapContainer center={props.center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {props.objects.map((o) => (
            <ObjectMarker
              key={o.id}
              id={o.id}
              lat={o.lat}
              lng={o.lng}
              headingDeg={o.headingDeg}
              lost={o.lost}
              lastSeenAt={o.lastSeenAt}
              removeInMs={o.removeInMs}
            />
          ))}
        </MapContainer>
      </Box>
    </Paper>
  )
})
