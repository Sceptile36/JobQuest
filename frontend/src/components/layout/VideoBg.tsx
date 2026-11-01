import { VIDEO_URL } from '@/lib/constants'

export function VideoBg() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <video
        autoPlay loop muted playsInline
        src={VIDEO_URL}
        className="w-full h-full object-cover opacity-[0.18]"
      />
      {/* Dark overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0c0c0c]/55 to-[#0c0c0c]/72" />
    </div>
  )
}
