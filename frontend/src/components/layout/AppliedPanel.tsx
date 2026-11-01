import { motion, AnimatePresence } from 'motion/react'
import { SEED_APPLIED } from '@/lib/constants'
import { scoreColor } from '@/lib/utils'
import { StatusPill } from '@/components/ui/StatusPill'
import type { AppliedCompany, ApplicationStatus } from '@/types'

// In production, this list comes from GET /applications merged with SEED_APPLIED
// and sorted by sent_at desc. For now we use the seed list.

function CompanyCard({ c, delay }: { c: AppliedCompany; delay: number }) {
  const bar = scoreColor(c.score)
  const textC = c.textColor ?? '#fff'

  return (
    <motion.div
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] }}
      className="liquid-glass rounded-[10px] p-[11px] mb-[7px] group
                 hover:border-white/14 transition-colors duration-200"
    >
      {/* Top row */}
      <div className="flex items-center gap-[9px] mb-[7px]">
        <div
          className="w-[30px] h-[30px] rounded-lg flex items-center justify-center
                     text-[13px] font-extrabold flex-shrink-0 tracking-tight"
          style={{ background: c.color, color: textC }}
        >
          {c.letter}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold leading-tight">{c.name}</div>
          <div className="text-[10px] text-white/40 font-mono mt-[1px] truncate">{c.role}</div>
        </div>
        <StatusPill status={c.status as ApplicationStatus} />
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between mb-[6px]">
        <span className="text-[10px] font-mono text-white/40">
          Match:{' '}
          <span className="font-semibold" style={{ color: bar }}>
            {c.score}%
          </span>
        </span>
        <span className="text-[10px] text-white/25">{c.time}</span>
      </div>

      {/* Score bar */}
      <div className="h-[2px] rounded-full bg-white/[0.07] overflow-hidden">
        <div
          className="h-full rounded-full score-bar-fill"
          style={{ width: `${c.score}%`, background: bar }}
        />
      </div>
    </motion.div>
  )
}

export function AppliedPanel() {
  const sent    = SEED_APPLIED.filter((c) => c.status !== 'pending')
  const pending = SEED_APPLIED.filter((c) => c.status === 'pending')

  return (
    <aside
      className="w-[272px] flex-shrink-0 flex flex-col
                 border-l border-white/[0.07] bg-black/45
                 backdrop-blur-xl z-10"
    >
      {/* Header */}
      <div className="px-4 pt-[14px] pb-[10px] border-b border-white/[0.07]">
        <h3 className="text-[13px] font-bold tracking-tight">
          Applied{' '}
          <span className="gradient-text">Companies</span>
        </h3>
        <p className="text-[10px] font-mono text-white/35 mt-[2px]">
          AI outreach · real-time feed
        </p>
      </div>

      {/* Glow separator */}
      <div
        className="h-px mx-0 mt-0"
        style={{
          background: 'linear-gradient(to right, transparent, rgba(0,210,255,0.28), transparent)',
        }}
      />

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3">
        <AnimatePresence>
          {sent.length > 0 && (
            <>
              <p className="text-[9px] font-mono text-white/30 tracking-[0.1em] uppercase mb-2 mt-1">
                Sent ({sent.length})
              </p>
              {sent.map((c, i) => (
                <CompanyCard key={`${c.name}-${i}`} c={c} delay={i * 0.04} />
              ))}
            </>
          )}

          {pending.length > 0 && (
            <>
              <p className="text-[9px] font-mono text-white/30 tracking-[0.1em] uppercase mb-2 mt-3">
                Pending Approval
              </p>
              {pending.map((c, i) => (
                <CompanyCard
                  key={`${c.name}-pend-${i}`}
                  c={c}
                  delay={(sent.length + i) * 0.04}
                />
              ))}
            </>
          )}
        </AnimatePresence>
      </div>
    </aside>
  )
}
