interface Props {
  icon: string
  message: string
}

export function EmptyState({ icon, message }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 opacity-40 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="text-[13px] text-white/45 max-w-[220px] leading-relaxed">{message}</p>
    </div>
  )
}
