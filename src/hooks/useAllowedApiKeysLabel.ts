import { useMemo } from 'react'
import { DEMO_API_KEY } from '../constants/app'

export function useAllowedApiKeysLabel() {
  return useMemo(() => {
    const extraKeysFromEnv = (import.meta.env.VITE_API_KEYS as string | undefined)
      ? String(import.meta.env.VITE_API_KEYS)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : []

    return [DEMO_API_KEY, ...extraKeysFromEnv].join(', ')
  }, [])
}
