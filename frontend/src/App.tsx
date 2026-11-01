import { useCallback } from 'react'

// Layout
import { VideoBg }      from '@/components/layout/VideoBg'
import { TitleBar }     from '@/components/layout/TitleBar'
import { PipelineBar }  from '@/components/layout/PipelineBar'
import { Sidebar }      from '@/components/layout/Sidebar'
import { AppliedPanel } from '@/components/layout/AppliedPanel'

// Views
import { OnboardView }   from '@/components/views/OnboardView'
import { JobsView } from '@/components/views/JobsView'
import { WatchlistView } from '@/components/views/WatchlistView'
import { DraftsView }    from '@/components/views/DraftsView'
import { HistoryView }   from '@/components/views/HistoryView'

// Hooks & types
import { useAppState }   from '@/hooks/useAppState'
import { useWebSocket }  from '@/hooks/useWebSocket'
import type { AppCtx, PipelineStepId, WsMessage } from '@/types'

export default function App() {
  const {
    ctx, setCtx,
    view, navigate,
    pipeStep, setPipeStep,
    drafts, addDraft, updateDraft, removeDraft,
    wsStatus, setWsStatus,
    pendingCount,
  } = useAppState()

  // ── WebSocket handler ──────────────────────────────────────────
  const handleWsMessage = useCallback((msg: WsMessage) => {
    if (msg.type === 'new_draft') {
      addDraft(msg.draft)
    }
    if (msg.type === 'pipeline_update') {
      setPipeStep(msg.step)
    }
  }, [addDraft, setPipeStep])

  useWebSocket(ctx.resumeId, {
    onMessage: handleWsMessage,
    onStatusChange: setWsStatus,
    enabled: !!ctx.resumeId,
  })

  // ── Onboard complete ───────────────────────────────────────────
  function handleOnboardComplete(next: AppCtx) {
    setCtx(next)
    setPipeStep('scan')
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0c0c0c] text-white">
      {/* Background video */}
      <VideoBg />

      {/* Vertical guide lines */}
      <div className="hidden md:block pointer-events-none fixed inset-y-0
                      left-1/2 -translate-x-[calc(50%+36rem)]
                      w-px bg-white/[0.06] z-[3]" />
      <div className="hidden md:block pointer-events-none fixed inset-y-0
                      left-1/2 translate-x-[calc(-50%+36rem)]
                      w-px bg-white/[0.06] z-[3]" />

      {/* Noise SVG filter */}
      <svg className="absolute w-0 h-0 pointer-events-none">
        <defs>
          <filter id="c3-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0" />
            <feComposite in2="SourceGraphic" operator="in" result="noise" />
            <feBlend in="SourceGraphic" in2="noise" mode="multiply" />
          </filter>
        </defs>
      </svg>

      {/* App shell */}
      <div className="relative z-[5] flex flex-col h-screen overflow-hidden">

        {/* macOS title bar */}
        <TitleBar />

        {/* Pipeline strip */}
        <PipelineBar activeStep={pipeStep} />

        {/* Three-column layout */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left: sidebar nav */}
          <Sidebar
            active={view}
            onNav={navigate}
            pendingDrafts={pendingCount}
            wsStatus={wsStatus}
          />

          {/* Center: main content */}
          <main className="flex-1 overflow-hidden flex flex-col bg-[#0c0c0c]/20">
            {view === 'onboard' && (
              <div className="flex-1 overflow-y-auto">
                <OnboardView
                  ctx={ctx}
                  onComplete={handleOnboardComplete}
                  onNavigate={(v) => navigate(v)}
                  isComplete={!!(ctx.userId && ctx.resumeId)}
                />
              </div>
            )}

            {view === 'watchlist' && (
              <div className="flex-1 overflow-y-auto">
                <WatchlistView resumeId={ctx.resumeId} />
              </div>
            )}

            {view === 'jobs' && (
              <div className="flex-1 overflow-y-auto">
                <JobsView resumeId={ctx.resumeId} />
              </div>
            )}

            {view === 'drafts' && (
              <DraftsView
                resumeId={ctx.resumeId}
                drafts={drafts}
                onDraftUpdate={updateDraft}
                onDraftRemove={removeDraft}
                onPipeStep={(s) => setPipeStep(s as PipelineStepId)}
              />
            )}

            {view === 'history' && (
              <div className="flex-1 overflow-y-auto">
                <HistoryView resumeId={ctx.resumeId} />
              </div>
            )}
          </main>

          {/* Right: applied companies panel */}
          <AppliedPanel />

        </div>
      </div>
    </div>
  )
}
