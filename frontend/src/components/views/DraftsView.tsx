import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { getDrafts, approveDraft, rejectDraft } from '@/lib/api'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Btn } from '@/components/ui/Btn'
import { StatusPill } from '@/components/ui/StatusPill'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { scoreColor, timeAgo } from '@/lib/utils'
import type { Draft } from '@/types'

interface Props {
  resumeId: string | null
  drafts: Draft[]
  onDraftUpdate: (id: string, patch: Partial<Draft>) => void
  onDraftRemove: (id: string) => void
  onPipeStep: (step: 'draft' | 'approve' | 'sent') => void
}

export function DraftsView({ resumeId, drafts, onDraftUpdate, onDraftRemove, onPipeStep }: Props) {
  const [selected, setSelected]  = useState<Draft | null>(null)
  const [feedback, setFeedback]  = useState('')
  const [loading, setLoading]    = useState(false)
  const [fetching, setFetching]  = useState(true)

  // Sync latest selected draft from state
  useEffect(() => {
    if (selected) {
      const latest = drafts.find((d) => d.id === selected.id)
      if (latest) setSelected(latest)
    }
  }, [drafts])

  useEffect(() => {
    if (!resumeId) { setFetching(false); return }
    getDrafts(resumeId)
      .then(() => { /* drafts already in parent state via WS */ })
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [resumeId])

  async function handleApprove(id: string) {
    setLoading(true)
    try {
      await approveDraft(id)
      onDraftRemove(id)
      setSelected(null)
      onPipeStep('sent')
    } catch { /* silent */ } finally { setLoading(false) }
  }

  async function handleReject(id: string) {
    if (!feedback.trim()) return
    setLoading(true)
    try {
      const updated = await rejectDraft(id, feedback)
      onDraftUpdate(id, { status: 'rewriting', version: updated.version })
      setSelected(null)
      setFeedback('')
      onPipeStep('draft')
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const pending   = drafts.filter((d) => d.status === 'pending')
  const rewriting = drafts.filter((d) => d.status === 'rewriting')

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left list ──────────────────────────────────────────────── */}
      <div className="w-[300px] flex-shrink-0 border-r border-white/[0.07] flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.07]">
          <SectionHeader
            eyebrow="DRAFTS"
            tag="WEBSOCKET LIVE"
            title="Email Drafts"
          />
          <p className="text-[11px] text-white/35 -mt-2">Approve to send · feedback to rewrite</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {fetching ? (
            <Skeleton rows={3} />
          ) : drafts.length === 0 ? (
            <EmptyState icon="✦" message="The agent will push drafts here in real time once postings are matched." />
          ) : (
            <>
              {pending.length > 0 && (
                <>
                  <p className="text-[9px] font-mono text-amber-400 tracking-[0.1em] uppercase mb-2 mt-1">
                    Awaiting Review ({pending.length})
                  </p>
                  <AnimatePresence>
                    {pending.map((d) => (
                      <DraftCard
                        key={d.id}
                        draft={d}
                        active={selected?.id === d.id}
                        onClick={() => setSelected(d)}
                      />
                    ))}
                  </AnimatePresence>
                </>
              )}

              {rewriting.length > 0 && (
                <>
                  <p className="text-[9px] font-mono text-white/30 tracking-[0.1em] uppercase mb-2 mt-3">
                    Being Rewritten
                  </p>
                  {rewriting.map((d) => (
                    <DraftCard
                      key={d.id}
                      draft={d}
                      active={selected?.id === d.id}
                      onClick={() => setSelected(d)}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Right detail ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full opacity-30">
            <div className="text-4xl mb-3">✦</div>
            <p className="text-[13px] text-white/45">Select a draft to review</p>
          </div>
        ) : (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Back on mobile */}
            <button
              onClick={() => setSelected(null)}
              className="text-[12px] text-white/40 hover:text-white mb-4 transition-colors"
            >
              ← Back to list
            </button>

            {/* Meta */}
            <div className="flex flex-wrap gap-2 mb-3">
              <StatusPill status={selected.status} />
              {selected.poc_name && (
                <span className="text-[11px] font-mono px-2 py-[2px] rounded-full
                                 border border-white/10 text-white/50">
                  → {selected.poc_name}
                </span>
              )}
              <span
                className="text-[11px] font-mono px-2 py-[2px] rounded-full border"
                style={{
                  color: scoreColor(selected.match_score),
                  borderColor: scoreColor(selected.match_score) + '40',
                  background: scoreColor(selected.match_score) + '15',
                }}
              >
                {selected.match_score}% match
              </span>
              <span className="text-[11px] text-white/25">v{selected.version} · {selected.created_at ? timeAgo(selected.created_at) : ''}</span>
            </div>

            <h2 className="text-[20px] font-bold tracking-tight mb-1">{selected.subject}</h2>
            <p className="text-[12px] font-mono text-white/35 mb-5">
              {selected.poc_email ?? 'email not found'}
            </p>

            {/* Email body */}
            <div
              className="liquid-glass rounded-xl p-5 text-[13px] leading-[1.75]
                         text-white/65 whitespace-pre-wrap mb-5 font-sans"
            >
              {selected.body}
            </div>

            {/* Actions */}
            {selected.status === 'pending' && (
              <div className="flex flex-col gap-3">
                <Btn
                  variant="success"
                  loading={loading}
                  onClick={() => handleApprove(selected.id)}
                  full
                >
                  ✓ Approve & Send Email
                </Btn>

                <div className="flex gap-2.5 items-end">
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Feedback for rewrite — e.g. 'mention my OSS work, keep it to 3 sentences'"
                    rows={3}
                    className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-lg
                               px-3 py-2.5 text-[12px] text-white font-sans outline-none
                               placeholder:text-white/20 focus:border-amber-400/40
                               resize-none feedback-textarea transition-colors"
                  />
                  <Btn
                    variant="amber"
                    loading={loading}
                    onClick={() => handleReject(selected.id)}
                    className="self-end flex-shrink-0"
                  >
                    ↺ Rewrite
                  </Btn>
                </div>
              </div>
            )}

            {selected.status === 'rewriting' && (
              <div className="rounded-lg px-4 py-3 text-[12px] text-sky-300
                              bg-sky-400/[0.06] border border-sky-400/[0.12]">
                ↺ This draft is being rewritten by the agent. It will appear here when ready.
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ── Draft list card ────────────────────────────────────────────────
function DraftCard({
  draft,
  active,
  onClick,
}: {
  draft: Draft
  active: boolean
  onClick: () => void
}) {
  const bar = scoreColor(draft.match_score)

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      onClick={onClick}
      className="liquid-glass rounded-xl p-3.5 mb-2.5 cursor-pointer transition-all duration-150"
      style={{
        borderColor: active ? 'rgba(61,129,227,0.35)' : undefined,
        background: active ? 'rgba(61,129,227,0.07)' : undefined,
      }}
    >
      <div className="flex items-center gap-2 mb-[5px]">
        <StatusPill status={draft.status} />
        <span className="text-[10px] font-mono ml-auto" style={{ color: bar }}>
          {draft.match_score}% match
        </span>
      </div>
      <p className="text-[13px] font-semibold leading-tight mb-1">{draft.subject}</p>
      <p className="text-[11px] font-mono text-white/35 mb-2">
        {draft.poc_name ?? draft.poc_email ?? 'unknown'}
      </p>
      <p className="text-[12px] text-white/50 leading-relaxed line-clamp-2">{draft.body.slice(0, 120)}…</p>
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/[0.06]">
        <span className="text-[10px] font-mono text-white/25">v{draft.version}</span>
        <span className="text-[11px] text-brand">Review →</span>
      </div>
    </motion.div>
  )
}
