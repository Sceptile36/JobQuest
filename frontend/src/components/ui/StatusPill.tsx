import type { ApplicationStatus, DraftStatus } from '@/types'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'

interface Props {
  status: ApplicationStatus | DraftStatus
}

export function StatusPill({ status }: Props) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.pending
  const label = STATUS_LABELS[status] ?? status

  return (
    <span
      style={{
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
      }}
      className="inline-flex items-center px-[7px] py-[2px] rounded-full
                 text-[9px] font-bold font-mono tracking-widest uppercase"
    >
      {label}
    </span>
  )
}
