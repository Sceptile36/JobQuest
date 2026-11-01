import { PIPELINE_STEPS } from '@/lib/constants'
import type { PipelineStepId } from '@/types'

interface Props {
  activeStep: PipelineStepId
}

export function PipelineBar({ activeStep }: Props) {
  const activeIdx = PIPELINE_STEPS.findIndex((s) => s.id === activeStep)

  return (
    <div className="flex items-center px-4 py-[9px] gap-0
                    border-b border-white/[0.07] bg-black/30
                    overflow-x-auto flex-shrink-0">
      <span className="text-[10px] font-mono text-white/30 mr-3.5 flex-shrink-0 tracking-widest">
        PIPELINE
      </span>

      {PIPELINE_STEPS.map((step, i) => {
        const done   = i < activeIdx
        const active = i === activeIdx

        const textColor = done
          ? '#10b981'
          : active
          ? '#3D81E3'
          : 'rgba(255,255,255,0.22)'

        const connColor = done ? '#10b981' : 'rgba(255,255,255,0.08)'

        return (
          <div key={step.id} className="flex items-center">
            <div
              className="flex items-center gap-[5px] px-[10px] py-[3px] rounded-[4px] flex-shrink-0"
              style={{
                background: active ? 'rgba(61,129,227,0.12)' : 'transparent',
                border: `1px solid ${active ? 'rgba(61,129,227,0.25)' : 'transparent'}`,
                color: textColor,
                fontSize: 11,
                fontWeight: active ? 600 : 400,
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              <span
                className={active ? 'animate-pulse-dot inline-block' : 'inline-block'}
                style={{ fontSize: 11 }}
              >
                {step.icon}
              </span>
              {step.label}
            </div>

            {i < PIPELINE_STEPS.length - 1 && (
              <div
                className="flex-shrink-0"
                style={{
                  width: 20,
                  height: 1,
                  background: connColor,
                  transition: 'background 0.4s',
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
