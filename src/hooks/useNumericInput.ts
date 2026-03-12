import { useCallback, useState } from 'react'

/**
 * Хук для числового поля введення, який:
 * - зберігає значення як рядок (щоб не стрибало)
 * - дозволяє лише порожній рядок або цифри
 * - нормалізує при втраті фокусу (blur) за допомогою переданої функції normalize()
 */
export function useNumericInput(opts: {
  initial: number
  normalize: (n: number) => number
}) {
  const { initial, normalize } = opts
  const [value, setValue] = useState<string>(String(initial))

  const onChange = useCallback((next: string) => {
    if (next === '' || /^\d+$/.test(next)) setValue(next)
  }, [])

  const normalizeNow = useCallback(() => {
    const raw = value.trim()
    const n = raw === '' ? NaN : Number(raw)
    const next = normalize(n)
    setValue(String(next))
    return next
  }, [normalize, value])

  return { value, setValue, onChange, normalizeNow }
}
