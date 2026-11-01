import { type ReactNode, type ButtonHTMLAttributes } from 'react'
import { cls } from '@/lib/utils'

type Variant = 'primary' | 'ghost' | 'success' | 'amber'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
  small?: boolean
  children: ReactNode
  full?: boolean
}

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium font-sans ' +
  'transition-all duration-150 cursor-pointer select-none active:scale-[0.98] ' +
  'disabled:opacity-50 disabled:pointer-events-none'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-[#5090e8] hover:-translate-y-px',
  ghost:
    'bg-white/5 text-white/65 border border-white/10 hover:bg-white/9 hover:text-white',
  success: 'bg-emerald-500 text-white hover:bg-emerald-400',
  amber:   'bg-amber-400 text-black font-bold hover:bg-amber-300',
}

const SIZES = {
  normal: 'px-[18px] py-[10px] text-[13px]',
  small:  'px-3 py-[7px] text-[12px]',
}

export function Btn({
  variant = 'primary',
  loading = false,
  small = false,
  full = false,
  children,
  className,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={loading || rest.disabled}
      className={cls(
        BASE,
        VARIANTS[variant],
        small ? SIZES.small : SIZES.normal,
        full ? 'w-full' : '',
        className,
      )}
    >
      {loading && (
        <span
          className="w-3 h-3 rounded-full border-2 border-white/20 border-t-white animate-spin"
          aria-hidden
        />
      )}
      {children}
    </button>
  )
}
