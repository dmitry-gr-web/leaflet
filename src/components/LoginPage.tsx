import { Alert, Box, Button, CircularProgress, Container, Paper, Snackbar, TextField, Typography } from '@mui/material'
import { observer } from 'mobx-react-lite'
import { useMemo, useState } from 'react'
import {
    DEFAULT_COUNT,
    DEFAULT_REMOVE_AFTER_SEC,
    DEMO_API_KEY,
    MAX_COUNT,
    MAX_REMOVE_AFTER_SEC,
} from '../constants/app'
import { useAllowedApiKeysLabel } from '../hooks/useAllowedApiKeysLabel'
import { useLogin } from '../hooks/useLogin'
import { useNumericInput } from '../hooks/useNumericInput'
import { useStores } from '../stores/StoresProvider'
import { clampInt } from '../utils/number'

function clampCount(n: number) {
  return clampInt(n, { min: 1, max: MAX_COUNT, fallback: DEFAULT_COUNT })
}

function clampRemoveAfterSec(n: number) {
  return clampInt(n, { min: 1, max: MAX_REMOVE_AFTER_SEC, fallback: DEFAULT_REMOVE_AFTER_SEC })
}

export const LoginPage = observer(function LoginPage(props: { initialError?: string | null }) {
  const { authStore } = useStores()
  const [key, setKey] = useState(authStore.apiKey ?? '')

  const wsUrl = import.meta.env.VITE_WS_URL as string | undefined
  const allowedKeysLabel = useAllowedApiKeysLabel()

  const count = useNumericInput({ initial: authStore.viewerCount ?? DEFAULT_COUNT, normalize: clampCount })
  const removeAfter = useNumericInput({
    initial: authStore.removeAfterSec ?? DEFAULT_REMOVE_AFTER_SEC,
    normalize: clampRemoveAfterSec,
  })

  const {
    error,
    setError,
    showSuccess,
    setShowSuccess,
    isSubmitting,
    showErrorToast,
    setShowErrorToast,
    canSubmit,
    tryLogin,
  } = useLogin({
    initialError: props.initialError,
    wsUrl,
    onSuccess: (apiKey) => {
      authStore.setViewerCount(count.normalizeNow())
      authStore.setRemoveAfterSec(removeAfter.normalizeNow())
      authStore.setApiKey(apiKey)
    },
  })

  const canSubmitWithKey = useMemo(() => key.trim().length > 0 && canSubmit, [key, canSubmit])

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Вхід за ключем
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Введіть унікальний ключ доступу. Він збережеться у браузері.
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          WS: {wsUrl ?? '(не задано, використовується мок)'}
        </Typography>

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        ) : null}

        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault()
            void tryLogin(key)
          }}
          sx={{ display: 'flex', gap: 2, alignItems: 'center' }}
        >
          <TextField
            fullWidth
            label="API key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            autoComplete="off"
            size="small"
            helperText={`Для локального сервера підходять ключі: ${allowedKeysLabel}`}
          />
          <Button type="submit" variant="contained" disabled={!canSubmitWithKey}>
            {isSubmitting ? <CircularProgress size={20} /> : 'Увійти'}
          </Button>
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="Кількість об’єктів"
            inputMode="numeric"
            size="small"
            value={count.value}
            onChange={(e) => count.onChange(e.target.value)}
            onBlur={() => {
              count.normalizeNow()
            }}
            helperText={`За замовчуванням ${DEFAULT_COUNT} (1..${MAX_COUNT})`}
          />

          <TextField
            label="Видаляти через (сек)"
            inputMode="numeric"
            size="small"
            value={removeAfter.value}
            onChange={(e) => removeAfter.onChange(e.target.value)}
            onBlur={() => {
              removeAfter.normalizeNow()
            }}
            helperText={`За замовчуванням ${DEFAULT_REMOVE_AFTER_SEC} (до ${MAX_REMOVE_AFTER_SEC})`}
          />
        </Box>

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            size="small"
            disabled={isSubmitting}
            onClick={() => {
              setKey(DEMO_API_KEY)
              void tryLogin(DEMO_API_KEY)
            }}
          >
            Увійти з {DEMO_API_KEY}
          </Button>
        </Box>

        <Snackbar
          open={showErrorToast}
          autoHideDuration={3000}
          onClose={() => setShowErrorToast(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="error" variant="filled" onClose={() => setShowErrorToast(false)}>
            {error ?? 'Помилка входу'}
          </Alert>
        </Snackbar>

        <Snackbar
          open={showSuccess}
          autoHideDuration={2000}
          onClose={() => setShowSuccess(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="success" variant="filled" onClose={() => setShowSuccess(false)}>
            Успішний вхід
          </Alert>
        </Snackbar>
      </Paper>
    </Container>
  )
})
