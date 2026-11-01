import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { getApplications } from '@/lib/api'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { StatusPill } from '@/components/ui/StatusPill'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { scoreColor, timeAgo } from '@/lib/utils'
import type { Application } from '@/types'

interface Props {
  resumeId: string | null
}

interface StatCardProps {
  value: number
  label: string
  color: string
  delay: number
}

function StatCard({ value, label, color, delay }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="liquid-glass rounded-xl px-4 py-3.5 text-center"
    >
      <div
        className="text-[28px] font-extrabold font-mono tracking-tighter mb-[2px]"
        style={{ color }}
      >
        {value}
      </div>
      <div className="text-[10px] text-white/35 uppercase tracking-[0.06em]">{label}</div>
    </motion.div>
  )
}

export function HistoryView({ resumeId }: Props) {
  const [apps, setApps]       = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!resumeId) { setLoading(false); return }
    getApplications(resumeId)
      .then((d) => setApps(d.applications ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [resumeId])

  const total   = apps.length
  const sent    = apps.filter((a) => ['sent', 'viewed', 'replied'].includes(a.status)).length
  const pending = apps.filter((a) => a.status === 'pending').length
  const replied = apps.filter((a) => a.status === 'replied').length

  return (
    <div className="max-w-2xl mx-auto py-7 px-4">
      <SectionHeader
        eyebrow="HISTORY"
        tag="ALL TIME"
        title="Outreach History"
        subtitle="Every email the agent has sent on your behalf."
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2.5 mb-6">
        <StatCard value={total}   label="Total"   color="#3D81E3" delay={0} />
        <StatCard value={sent}    label="Sent"    color="#10b981" delay={0.05} />
        <StatCard value={replied} label="Replied" color="#A4F4FD" delay={0.1} />
        <StatCard value={pending} label="Pending" color="#f59e0b" delay={0.15} />
      </div>

      {/* List */}
      {loading ? (
        <Skeleton rows={5} />
      ) : apps.length === 0 ? (
        <EmptyState icon="≡" message="No outreach yet. Approve a draft to send your first email." />
      ) : (
        <div className="flex flex-col gap-2">
          {apps.map((a, i) => {
            const sc = scoreColor(a.match_score)
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
                className="liquid-glass rounded-xl px-3.5 py-3 flex items-center gap-3"
              >
                {/* Avatar */}
                <div
                  className="w-[34px] h-[34px] rounded-lg flex items-center justify-center
                             text-[12px] font-extrabold flex-shrink-0"
                  style={{ background: '#1a2236', color: '#3D81E3', border: '1px solid rgba(61,129,227,0.2)' }}
                >
                  {a.company?.[0]?.toUpperCase() ?? '?'}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate">{a.job_title ?? 'Untitled role'}</p>
                  <p className="text-[11px] font-mono text-white/35 truncate">
                    {a.company ?? '—'} · {a.poc_email ?? 'email unknown'}
                  </p>
                </div>

                <StatusPill status={a.status} />

                <div className="text-right flex-shrink-0">
                  <div className="text-[13px] font-bold font-mono" style={{ color: sc }}>
                    {Math.round(a.match_score * 100)}%
                  </div>
                  <div className="text-[10px] text-white/25">match</div>
                </div>

                <div className="text-[10px] text-white/25 flex-shrink-0">
                  {a.sent_at ? timeAgo(a.sent_at) : '—'}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
