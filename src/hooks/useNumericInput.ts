import { useCallback, useState } from 'react'

/**
 * Хелпер для numeric input, который:
 * - хранит значение как string (чтобы не "прыгало")
 * - пропускает только пустую строку или цифры
 * - нормализует по blur через переданную функцию normalize()
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
