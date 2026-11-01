import { useState, useCallback } from 'react'
import type {
  ViewId,
  PipelineStepId,
  Draft,
  WatchlistEntry,
  AppCtx,
} from '@/types'

const STORAGE_KEY = 'jobagent_ctx'

function loadCtx(): AppCtx {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as AppCtx
  } catch { /* ignore */ }
  return { userId: null, resumeId: null }
}

function saveCtx(ctx: AppCtx) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx))
  } catch { /* ignore */ }
}

export function useAppState() {
  const [ctx, setCtxRaw]         = useState<AppCtx>(loadCtx)
  const [view, setView]           = useState<ViewId>('onboard')
  const [pipeStep, setPipeStep]   = useState<PipelineStepId>('upload')
  const [drafts, setDrafts]       = useState<Draft[]>([])
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([])
  const [wsStatus, setWsStatus]   = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting')

  const setCtx = useCallback((next: AppCtx) => {
    setCtxRaw(next)
    saveCtx(next)
  }, [])

  const navigate = useCallback((id: ViewId) => {
    setView(id)
    if (id === 'watchlist') setPipeStep('scan')
    if (id === 'drafts')    setPipeStep('approve')
    if (id === 'history')   setPipeStep('sent')
  }, [])

  const addDraft = useCallback((draft: Draft) => {
    setDrafts((prev) => {
      // avoid duplicates from WS re-delivery
      if (prev.some((d) => d.id === draft.id)) return prev
      return [draft, ...prev]
    })
  }, [])

  const updateDraft = useCallback((id: string, patch: Partial<Draft>) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  }, [])

  const removeDraft = useCallback((id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id))
  }, [])

  const pendingCount = drafts.filter((d) => d.status === 'pending').length

  return {
    ctx, setCtx,
    view, navigate,
    pipeStep, setPipeStep,
    drafts, setDrafts, addDraft, updateDraft, removeDraft,
    watchlist, setWatchlist,
    wsStatus, setWsStatus,
    pendingCount,
  }
}
