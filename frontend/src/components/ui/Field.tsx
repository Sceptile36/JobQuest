import { type InputHTMLAttributes, type SelectHTMLAttributes } from 'react'

interface BaseProps {
  label: string
}

interface InputProps extends BaseProps, InputHTMLAttributes<HTMLInputElement> {
  as?: 'input'
}

interface SelectProps extends BaseProps, SelectHTMLAttributes<HTMLSelectElement> {
  as: 'select'
  children: React.ReactNode
}

type Props = InputProps | SelectProps

const inputCls =
  'w-full bg-white/[0.05] border border-white/[0.08] rounded-lg ' +
  'px-[13px] py-[9px] text-[13px] text-white font-sans outline-none ' +
  'transition-colors duration-150 placeholder:text-white/20 ' +
  'focus:border-brand/45 hover:border-white/14'

export function Field(props: Props) {
  const { label, as = 'input', ...rest } = props

  return (
    <div>
      <p className="text-[11px] font-semibold text-white/45 tracking-[0.06em] uppercase mb-[5px]">
        {label}
      </p>
      {as === 'select' ? (
        <select
          {...(rest as SelectHTMLAttributes<HTMLSelectElement>)}
          className={inputCls + ' cursor-pointer'}
        />
      ) : (
        <input
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
          className={inputCls}
        />
      )}
    </div>
  )
}
