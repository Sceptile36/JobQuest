interface Props {
  rows?: number
  className?: string
}

export function Skeleton({ rows = 3, className = '' }: Props) {
  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-[52px] rounded-xl"
          style={{
            background:
              'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.6s linear infinite',
          }}
        />
      ))}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>
    </div>
  )
}
