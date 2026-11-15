import type { PipelineStep, NavItem, AppliedCompany } from '@/types'

export const PIPELINE_STEPS: PipelineStep[] = [
  { id: 'upload',  label: 'Upload',  icon: '↑' },
  { id: 'scan',    label: 'Scan',    icon: '⊙' },
  { id: 'score',   label: 'Score',   icon: '◈' },
  { id: 'contact', label: 'Contact', icon: '◉' },
  { id: 'draft',   label: 'Draft',   icon: '✦' },
  { id: 'approve', label: 'Approve', icon: '✓' },
  { id: 'sent',    label: 'Sent',    icon: '→' },
]

export const NAV_ITEMS: NavItem[] = [
  { id: 'onboard',   label: 'Resume & Prefs', icon: '⊕' },
  { id: 'watchlist', label: 'Watchlist',       icon: '◎' },
  { id: 'jobs',      label: 'Jobs',           icon: '▤' },
  { id: 'drafts',    label: 'Drafts',          icon: '✦' },
  { id: 'history',   label: 'History',         icon: '≡' },
]

// Seed data — replaced by real API responses at runtime
export const SEED_APPLIED: AppliedCompany[] = [];

export const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_064122_c4750c0e-7476-4b44-94a2-a85a65c63bf2.mp4'
