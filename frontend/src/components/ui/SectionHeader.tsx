interface Props {
  eyebrow?: string
  tag?: string
  title: string
  subtitle?: string
}

export function SectionHeader({ eyebrow, tag, title, subtitle }: Props) {
  return (
    <div className="mb-5">
      {(eyebrow || tag) && (
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />
          {eyebrow && (
            <span className="text-[11px] font-mono text-white/45">{eyebrow}</span>
          )}
          {tag && (
            <span className="px-2 py-[2px] rounded-full bg-brand/12 border border-brand/20
                             text-[10px] text-brand font-mono">
              {tag}
            </span>
          )}
        </div>
      )}
      <h2 className="text-[20px] font-bold tracking-tight">{title}</h2>
      {subtitle && (
        <p className="text-[12px] text-white/45 mt-1 leading-relaxed">{subtitle}</p>
      )}
    </div>
  )
}
