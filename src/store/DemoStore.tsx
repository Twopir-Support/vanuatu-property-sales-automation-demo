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
  /** Like `run`, but shows a short in-progress state first (keyed so buttons can show a spinner). */
  runDelayed: (key: string, fn: (s: DemoState) => Result, ms?: number) => void
  busy: string | null
  interviewMode: boolean
  setInterviewMode: (on: boolean) => void
  guideOpen: boolean
  setGuideOpen: (on: boolean) => void
  guideStep: number
  setGuideStep: (n: number) => void
}

const PREFS_KEY = 'phd-property-sales-demo-prefs'
interface Prefs { interviewMode: boolean; guideOpen: boolean; guideStep: number }
const DEFAULT_PREFS: Prefs = { interviewMode: false, guideOpen: false, guideStep: 0 }
function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return DEFAULT_PREFS
}

const Ctx = createContext<StoreValue | null>(null)

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(load)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [prefs, setPrefs] = useState(loadPrefs)
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
    } catch {
      /* ignore */
    }
  }, [prefs])
  const setInterviewMode = useCallback((on: boolean) => setPrefs((p) => ({ ...p, interviewMode: on })), [])
  const setGuideOpen = useCallback((on: boolean) => setPrefs((p) => ({ ...p, guideOpen: on })), [])
  const setGuideStep = useCallback((n: number) => setPrefs((p) => ({ ...p, guideStep: n })), [])
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

  const runDelayed = useCallback(
    (key: string, fn: (s: DemoState) => Result, ms = 650) => {
      setBusy(key)
      window.setTimeout(() => {
        run(fn)
        setBusy(null)
      }, ms)
    },
    [run],
  )

  const reset = useCallback(() => {
    const seed = createSeedState()
    ref.current = seed
    setState(seed)
    setPrefs((p) => ({ ...p, guideStep: 0 }))
    notify({ kind: 'info', title: 'Demo data reset', message: 'All synthetic records restored to the starting scenario.' })
  }, [notify])

  const value = useMemo(
    () => ({ state, run, reset, toasts, notify, dismiss, runDelayed, busy, interviewMode: prefs.interviewMode, setInterviewMode, guideOpen: prefs.guideOpen, setGuideOpen, guideStep: prefs.guideStep, setGuideStep }),
    [state, run, reset, toasts, notify, dismiss, runDelayed, busy, prefs, setInterviewMode, setGuideOpen, setGuideStep],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useDemo(): StoreValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useDemo must be used inside DemoStoreProvider')
  return v
}
