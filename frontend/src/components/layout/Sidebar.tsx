import { NAV_ITEMS } from '@/lib/constants'
import type { ViewId } from '@/types'
import { cls } from '@/lib/utils'

interface Props {
  active: ViewId
  onNav: (id: ViewId) => void
  pendingDrafts: number
  wsStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
}

const WS_COLORS: Record<string, string> = {
  connected:    '#10b981',
  connecting:   '#f59e0b',
  disconnected: '#f43f5e',
  error:        '#f43f5e',
}

export function Sidebar({ active, onNav, pendingDrafts, wsStatus }: Props) {
  return (
    <aside
      className="w-[220px] flex-shrink-0 flex flex-col
                 bg-black/50 border-r border-white/[0.07]
                 backdrop-blur-xl z-10"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/[0.07]">
        <svg viewBox="0 0 256 256" fill="white" className="w-7 h-7 flex-shrink-0">
          <path d="M 0 128 C 70.692 128 128 185.308 128 256 L 64 256 C 64 220.654 35.346 192 0 192 Z M 256 192 C 220.654 192 192 220.654 192 256 L 128 256 C 128 185.308 185.308 128 256 128 Z M 128 0 C 128 70.692 70.692 128 0 128 L 0 64 C 35.346 64 64 35.346 64 0 Z M 192 0 C 192 35.346 220.654 64 256 64 L 256 128 C 185.308 128 128 70.692 128 0 Z" />
        </svg>
        <div>
          <div className="text-[14px] font-bold tracking-tight">JobAgent</div>
          <div className="text-[10px] font-mono text-white/30 mt-[1px]">AI‑NATIVE · v1.0</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 flex flex-col gap-[2px] overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id
          // Override draft badge with live count
          const badge = item.id === 'drafts' && pendingDrafts > 0
            ? String(pendingDrafts)
            : item.id !== 'drafts'
            ? item.badge
            : undefined

          return (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              className={cls(
                'w-full flex items-center gap-2.5 px-3 py-[8px] rounded-lg text-left',
                'text-[13px] font-medium border transition-all duration-150',
                isActive
                  ? 'bg-brand/12 border-brand/20 text-white'
                  : 'bg-transparent border-transparent text-white/45 hover:bg-white/5 hover:text-white/75',
              )}
            >
              <span
                className="text-[14px] flex-shrink-0"
                style={{ color: isActive ? '#3D81E3' : undefined }}
              >
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {badge && (
                <span
                  className={cls(
                    'text-[10px] font-bold font-mono px-[6px] py-[1px] rounded-full',
                    item.badgeVariant === 'green'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-amber-400 text-black',
                  )}
                >
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* WS indicator */}
      <div className="px-4 py-3 border-t border-white/[0.07]">
        <div className="flex items-center gap-2">
          <div
            className="w-[7px] h-[7px] rounded-full flex-shrink-0 animate-pulse-dot"
            style={{ background: WS_COLORS[wsStatus] ?? '#10b981' }}
          />
          <span className="text-[10px] font-mono text-white/30 tracking-widest uppercase">
            WS {wsStatus}
          </span>
        </div>
      </div>
    </aside>
  )
}
