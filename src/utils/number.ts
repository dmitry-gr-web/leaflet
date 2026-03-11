export function clampInt(n: number, opts: { min: number; max: number; fallback: number }) {
  const { min, max, fallback } = opts
  if (!Number.isFinite(n)) return fallback
  const i = Math.floor(n)
  if (i < min) return fallback
  return Math.min(max, i)
}
