import { Button, Chip, Stack, Typography } from '@mui/material'
import { observer } from 'mobx-react-lite'

export const MapHeader = observer(function MapHeader(props: {
  wsStatus: string
  viewerCount: number
  removeAfterSec: number
  objectsCount: number
  apiKey: string | null
  isResetting: boolean
  onReset: () => void
  onLogout: () => void
}) {
  return (
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
      <Chip label={`WS: ${props.wsStatus}`} variant="outlined" />
      <Chip label={`Ліміт: ${props.viewerCount}`} variant="outlined" />
      <Chip label={`Видалення: ${props.removeAfterSec}s`} variant="outlined" />
      <Chip label={`Об’єктів: ${props.objectsCount}`} />
      <Button size="small" variant="outlined" disabled={props.isResetting} onClick={props.onReset}>
        Скинути об’єкти
      </Button>
      <Chip
        color="primary"
        variant="outlined"
        label={`Ключ: ${props.apiKey ?? ''}`}
        onDelete={props.onLogout}
      />
    </Stack>
  )
})
