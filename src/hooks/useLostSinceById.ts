import { useEffect, useState } from 'react';

export type LostFlagItem = { id: string; lost: boolean }

/**
 * Хранит момент времени (timestamp), когда объект впервые стал lost.
 * - добавляет запись при переходе ok -> lost
 * - удаляет при переходе lost -> ok
 * - чистит записи, если объект исчез из списка
 */
export function useLostSinceById(items: LostFlagItem[], now: number) {
  const [lostSinceById, setLostSinceById] = useState<Record<string, number>>({})

  useEffect(() => {
    const ids = new Set(items.map((o) => o.id))

    setLostSinceById((prev) => {
      let next: Record<string, number> | null = null

      // очистка удалённых
      for (const id of Object.keys(prev)) {
        if (!ids.has(id)) {
          next = next ?? { ...prev }
          delete next[id]
        }
      }

      // фиксация момента потери
      for (const o of items) {
        if (o.lost && prev[o.id] == null) {
          next = next ?? { ...prev }
          next[o.id] = now
        }
        if (!o.lost && prev[o.id] != null) {
          next = next ?? { ...prev }
          delete next[o.id]
        }
      }

      return next ?? prev
    })
  }, [items, now])

  return lostSinceById
}
