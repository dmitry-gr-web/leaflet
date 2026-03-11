// Мок «сервера»: генерує 100-200 об’єктів, інколи «втрачає» частину з них.

export type ServerObjectDto = {
  id: string
  lat: number
  lng: number
  headingDeg: number
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createMockStream(opts: { center: [number, number]; count: number }) {
  const rand = mulberry32(42)

  const state = new Map<string, { lat: number; lng: number; headingDeg: number; speed: number }>()

  for (let i = 0; i < opts.count; i++) {
    const id = `obj-${i + 1}`
    const lat = opts.center[0] + (rand() - 0.5) * 0.2
    const lng = opts.center[1] + (rand() - 0.5) * 0.2
    const headingDeg = rand() * 360
    const speed = 0.0005 + rand() * 0.0015
    state.set(id, { lat, lng, headingDeg, speed })
  }

  return {
    tick(): ServerObjectDto[] {
      const out: ServerObjectDto[] = []

      for (const [id, s] of state.entries()) {
        // інколи не віддаємо об’єкт (імітація «зник із сервера»)
        const drop = rand() < 0.12
        if (drop) continue

        // трохи змінюємо курс
        s.headingDeg = (s.headingDeg + (rand() - 0.5) * 10 + 360) % 360

        const rad = (s.headingDeg * Math.PI) / 180
        s.lat += Math.sin(rad) * s.speed
        s.lng += Math.cos(rad) * s.speed

        out.push({ id, lat: s.lat, lng: s.lng, headingDeg: s.headingDeg })
      }

      return out
    },
  }
}
