export function TitleBar() {
  return (
    <div
      className="h-10 flex-shrink-0 flex items-center justify-center relative
                 bg-black/60 border-b border-white/[0.07]
                 backdrop-blur-xl select-none z-10"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Traffic lights */}
      <div className="absolute left-4 flex gap-[7px] items-center">
        <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
        <div className="w-3 h-3 rounded-full bg-[#28c840]" />
      </div>

      <span className="text-[12px] text-white/40 font-medium tracking-[0.02em]">
        JobAgent — AI Outreach Dashboard
      </span>
    </div>
  )
}
