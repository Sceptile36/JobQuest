import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { getWatchlist, addToWatchlist, removeFromWatchlist } from '@/lib/api'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Btn } from '@/components/ui/Btn'
import { Field } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import type { WatchlistEntry, Platform } from '@/types'
import { timeAgo } from '@/lib/utils'

interface Props {
  resumeId: string | null
}

export function WatchlistView({ resumeId }: Props) {
  const [companies, setCompanies] = useState<WatchlistEntry[]>([])
  const [loading, setLoading]     = useState(false)
  const [fetching, setFetching]   = useState(true)
  const [error, setError]         = useState('')
  const [slug, setSlug]           = useState('')
  const [platform, setPlatform]   = useState<Platform>('greenhouse')

  useEffect(() => {
    if (!resumeId) { setFetching(false); return }
    getWatchlist(resumeId)
      .then((d) => setCompanies(d.companies ?? []))
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [resumeId])

  async function handleAdd() {
    if (!slug.trim() || !resumeId) return
    setLoading(true); setError('')
    try {
      const entry = await addToWatchlist(resumeId, slug.trim(), platform)
      setCompanies((prev) => [entry, ...prev])
      setSlug('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add company.')
    } finally { setLoading(false) }
  }

  async function handleRemove(id: string) {
    try {
      await removeFromWatchlist(id)
      setCompanies((prev) => prev.filter((c) => c.id !== id))
    } catch { /* silent */ }
  }

  return (
    <div className="max-w-xl mx-auto py-7 px-4">
      <SectionHeader
        eyebrow="WATCHLIST"
        tag="DAILY SCAN"
        title="Company Watchlist"
        subtitle="The agent scans these daily via Greenhouse & Lever for new postings."
      />

      {/* Add row */}
      <div className="flex gap-2.5 mb-4 items-end">
        <div className="flex-1">
          <Field
            label="Company Slug"
            placeholder="stripe, linear, vercel…"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
        </div>
        <div>
          <Field label="Platform" as="select"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as Platform)}
          >
            <option value="greenhouse">Greenhouse</option>
            <option value="lever">Lever</option>
          </Field>
        </div>
        <Btn onClick={handleAdd} loading={loading} className="self-end">
          Add
        </Btn>
      </div>

      {error && (
        <p className="text-[12px] text-rose-400 font-mono mb-3">✕ {error}</p>
      )}

      {fetching ? (
        <Skeleton rows={4} />
      ) : companies.length === 0 ? (
        <EmptyState icon="◎" message="No companies yet. Add one above and the agent will start scanning." />
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence>
            {companies.map((c) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
                className="liquid-glass rounded-[10px] px-3.5 py-3 flex items-center gap-3"
              >
                {/* Status dot */}
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: c.last_scanned ? '#10b981' : '#f59e0b' }}
                />

                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold">{c.slug}</p>
                </div>

                <span className="text-[10px] font-mono px-[7px] py-[2px] rounded-[4px]
                                 bg-white/[0.06] text-white/40">
                  {c.platform}
                </span>

                <span className="text-[10px] font-mono text-white/30">
                  {c.last_scanned ? `scanned ${timeAgo(c.last_scanned)}` : 'pending first scan'}
                </span>

                <button
                  onClick={() => handleRemove(c.id)}
                  className="text-[16px] text-white/25 hover:text-rose-400
                             transition-colors px-1.5 py-[1px] rounded"
                >
                  ×
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
