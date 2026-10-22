import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createSeedState, STATE_VERSION } from '../data/seed'
import type { DemoState } from '../data/types'
import type { Notice, Result } from './engine'
import { uid } from '../lib/format'

const STORAGE_KEY = 'phd-property-sales-demo'

function load(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState
      if (parsed.version === STATE_VERSION) return parsed
    }
  } catch {
    /* storage unavailable — fall back to seed */
  }
  return createSeedState()
}

export interface Toast extends Notice {
  id: string
}

interface StoreValue {
  state: DemoState
  /** Apply an engine transition and surface its notice as a toast. */
  run: (fn: (s: DemoState) => Result) => void
  reset: () => void
  toasts: Toast[]
  notify: (n: Notice) => void
  dismiss: (id: string) => void
}

const Ctx = createContext<StoreValue | null>(null)

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(load)
  const [toasts, setToasts] = useState<Toast[]>([])
  // Keep a ref so rapid repeated clicks evaluate against the latest state (idempotency).
  const ref = useRef(state)

  useEffect(() => {
    ref.current = state
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [state])

  const dismiss = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const notify = useCallback(
    (n: Notice) => {
      const id = uid('toast')
      setToasts((t) => [...t.slice(-2), { ...n, id }])
      window.setTimeout(() => dismiss(id), n.kind === 'error' ? 7000 : 4500)
    },
    [dismiss],
  )

  const run = useCallback(
    (fn: (s: DemoState) => Result) => {
      const r = fn(ref.current)
      ref.current = r.state
      setState(r.state)
      if (r.notice) notify(r.notice)
    },
    [notify],
  )

  const reset = useCallback(() => {
    const seed = createSeedState()
    ref.current = seed
    setState(seed)
    notify({ kind: 'info', title: 'Demo data reset', message: 'All synthetic records restored to the starting scenario.' })
  }, [notify])

  const value = useMemo(() => ({ state, run, reset, toasts, notify, dismiss }), [state, run, reset, toasts, notify, dismiss])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useDemo(): StoreValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useDemo must be used inside DemoStoreProvider')
  return v
}
