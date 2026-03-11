import { createContext, useContext } from 'react'
import type { RootStore } from './rootStore'

const StoresContext = createContext<RootStore | null>(null)

export const StoresProvider = StoresContext.Provider

export function useStores(): RootStore {
  const ctx = useContext(StoresContext)
  if (!ctx) throw new Error('StoresProvider is missing')
  return ctx
}
