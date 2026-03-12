import type { Tooltip as LeafletTooltip } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { observer } from 'mobx-react-lite'
import { useEffect, useMemo, useState } from 'react'
import { Marker, Tooltip } from 'react-leaflet'
import { formatMs } from '../utils/time'

function normalizeDeg(deg: number) {
  return ((deg % 360) + 360) % 360
}

function headingToSvgRotation(headingDegFromServer: number) {
  // 0° = схід, 90° = північ (бекенд)
  // конвертуємо в leaflet-обертання "північ = 0"
  return normalizeDeg(90 - headingDegFromServer)
}

function makeArrowSvg(headingDeg: number, color: string) {
  const rotate = `rotate(${headingToSvgRotation(headingDeg)} 12 12)`
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <g transform="${rotate}">
      <path d="M12 2 L19 21 L12 17 L5 21 Z" fill="${color}" fill-opacity="0.55"/>
      <path d="M12 4 L17.3 19 L12 16 L6.7 19 Z" fill="${color}" fill-opacity="0.85"/>
    </g>
  </svg>`
}

function headingIcon(headingDeg: number, lost: boolean) {
  const color = lost ? '#d32f2f' : '#1976d2'
  return new L.DivIcon({
    className: '',
    html: `<div style="transform: translate(-12px,-12px);">${makeArrowSvg(headingDeg, color)}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

export type ObjectMarkerProps = {
  id: string
  lat: number
  lng: number
  headingDeg: number
  lost: boolean
  lastSeenAt: number
  removeInMs: number | null
}

export const ObjectMarker = observer(function ObjectMarker(props: ObjectMarkerProps) {
  const { id, lat, lng, headingDeg, lost, lastSeenAt, removeInMs } = props

  const icon = useMemo(() => headingIcon(headingDeg, lost), [headingDeg, lost])

  const [tooltipRef, setTooltipRef] = useState<LeafletTooltip | null>(null)
  useEffect(() => {
    if (!tooltipRef) return
    tooltipRef.update()
  }, [tooltipRef, lost, lastSeenAt, removeInMs])

  return (
    <Marker position={[lat, lng]} icon={icon} opacity={lost ? 0.65 : 1}>
      <Tooltip
        permanent={false}
        direction="top"
        offset={[0, -8]}
        opacity={1}
        interactive={true}
        ref={(instance) => setTooltipRef(instance as unknown as LeafletTooltip | null)}
      >
        <div style={{ minWidth: 180, pointerEvents: 'none' }}>
          <div>
            <b>{id}</b> {lost ? ' (втрачено)' : ''}
          </div>
          <div>
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </div>
          <div>
            Курс: {headingDeg.toFixed(0)}°
          </div>
          <div>
            Статус: {lost ? 'втрачено' : 'ok'}
          </div>
          {lost && removeInMs != null ? (
            <div>
              Видалення через: <b>{formatMs(removeInMs)}</b>
            </div>
          ) : null}
        </div>
      </Tooltip>
    </Marker>
  )
})
