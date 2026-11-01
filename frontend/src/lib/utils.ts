import type { ApplicationStatus, DraftStatus, PipelineStepId } from '@/types'
import { PIPELINE_STEPS } from './constants'

export function timeAgo(iso: string | null): string {
  if (!iso) return 'never'
  const secs = (Date.now() - new Date(iso).getTime()) / 1000
  if (secs < 60)    return 'just now'
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

export function scoreColor(score: number): string {
  if (score >= 85) return '#10b981'   // emerald
  if (score >= 70) return '#A4F4FD'   // ice
  if (score >= 55) return '#f59e0b'   // amber
  return '#f43f5e'                     // rose
}

export function pipelineStepIndex(id: PipelineStepId): number {
  return PIPELINE_STEPS.findIndex((s) => s.id === id)
}

export const STATUS_LABELS: Record<ApplicationStatus | DraftStatus, string> = {
  pending:   'Pending',
  sent:      'Sent',
  viewed:    'Viewed',
  replied:   'Replied',
  approved:  'Approved',
  rewriting: 'Rewriting',
  rejected:  'Rejected',
}

export const STATUS_COLORS: Record<ApplicationStatus | DraftStatus, { bg: string; text: string; border: string }> = {
  pending:   { bg: 'rgba(245,158,11,0.12)',  text: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
  sent:      { bg: 'rgba(16,185,129,0.12)',  text: '#10b981', border: 'rgba(16,185,129,0.25)' },
  viewed:    { bg: 'rgba(61,129,227,0.12)',  text: '#3D81E3', border: 'rgba(61,129,227,0.25)' },
  replied:   { bg: 'rgba(164,244,253,0.12)', text: '#A4F4FD', border: 'rgba(164,244,253,0.25)' },
  approved:  { bg: 'rgba(16,185,129,0.12)',  text: '#10b981', border: 'rgba(16,185,129,0.25)' },
  rewriting: { bg: 'rgba(14,165,233,0.12)',  text: '#0EA5E9', border: 'rgba(14,165,233,0.25)' },
  rejected:  { bg: 'rgba(244,63,94,0.12)',   text: '#f43f5e', border: 'rgba(244,63,94,0.25)' },
}

export function cls(...args: (string | undefined | false | null)[]): string {
  return args.filter(Boolean).join(' ')
}
