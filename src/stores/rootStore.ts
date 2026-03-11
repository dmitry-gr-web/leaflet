import { makeAutoObservable } from 'mobx'
import { REMOVE_LOST_AFTER_MS } from '../constants/app'

export type RootStore = {
  authStore: AuthStore
  objectsStore: ObjectsStore
}

export class AuthStore {
  apiKey: string | null = null
  viewerCount: number = 100
  removeAfterSec: number = 300

  constructor() {
    makeAutoObservable(this)
    this.apiKey = window.localStorage.getItem('apiKey')

    const rawViewerCount = window.localStorage.getItem('viewerCount')
    const n = rawViewerCount ? Number(rawViewerCount) : 100
    this.viewerCount = Number.isFinite(n) && n > 0 ? Math.floor(n) : 100

    const rawRemoveAfterSec = window.localStorage.getItem('removeAfterSec')
    const s = rawRemoveAfterSec ? Number(rawRemoveAfterSec) : 300
    this.removeAfterSec = Number.isFinite(s) && s > 0 ? Math.floor(s) : 300
  }

  setApiKey(key: string) {
    const trimmed = key.trim()
    this.apiKey = trimmed.length ? trimmed : null
    if (this.apiKey) window.localStorage.setItem('apiKey', this.apiKey)
    else window.localStorage.removeItem('apiKey')
  }

  setViewerCount(count: number) {
    const n = Math.floor(count)
    this.viewerCount = Number.isFinite(n) && n > 0 ? n : 100
    window.localStorage.setItem('viewerCount', String(this.viewerCount))
  }

  setRemoveAfterSec(sec: number) {
    const s = Math.floor(sec)
    this.removeAfterSec = Number.isFinite(s) && s > 0 ? s : 300
    window.localStorage.setItem('removeAfterSec', String(this.removeAfterSec))
  }

  logout() {
    this.setApiKey('')
  }
}

export type TrackedObject = {
  id: string
  lat: number
  lng: number
  headingDeg: number
  lastSeenAt: number
  lost: boolean
}

export class ObjectsStore {
  objects = new Map<string, TrackedObject>()

  constructor() {
    makeAutoObservable(this)
    // prune вызывается извне (в useObjectsFeed) с пользовательским таймаутом.
  }

  clear() {
    this.objects.clear()
  }

  upsertFromServer(items: Array<{ id: string; lat: number; lng: number; headingDeg: number }>) {
    const now = Date.now()
    for (const item of items) {
      const existing = this.objects.get(item.id)
      const next: TrackedObject = {
        id: item.id,
        lat: item.lat,
        lng: item.lng,
        headingDeg: item.headingDeg,
        lastSeenAt: now,
        lost: false,
      }
      this.objects.set(item.id, existing ? { ...existing, ...next } : next)
    }
  }

  markLostIfStale(staleMs: number) {
    const now = Date.now()
    for (const obj of this.objects.values()) {
      if (!obj.lost && now - obj.lastSeenAt > staleMs) {
        obj.lost = true
      }
    }
  }

  prune(removeAfterLostMs: number = REMOVE_LOST_AFTER_MS) {
    const now = Date.now()
    for (const [id, obj] of this.objects.entries()) {
      if (obj.lost && now - obj.lastSeenAt > removeAfterLostMs) {
        this.objects.delete(id)
      }
    }
  }

  get list() {
    return Array.from(this.objects.values())
  }
}

export function createRootStore(): RootStore {
  const authStore = new AuthStore()
  const objectsStore = new ObjectsStore()
  return { authStore, objectsStore }
}
