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
  { id: 'drafts',    label: 'Drafts',          icon: '✦', badge: '3', badgeVariant: 'amber' },
  { id: 'history',   label: 'History',         icon: '≡', badge: '12', badgeVariant: 'green' },
]

// Seed data — replaced by real API responses at runtime
export const SEED_APPLIED: AppliedCompany[] = [
  { name: 'Stripe',      role: 'Backend Engineer',      score: 94, status: 'replied',  time: '2h ago',   color: '#635BFF', letter: 'S' },
  { name: 'Linear',      role: 'Product Engineer',      score: 91, status: 'viewed',   time: '5h ago',   color: '#5E6AD2', letter: 'L' },
  { name: 'Vercel',      role: 'Platform Engineer',     score: 88, status: 'sent',     time: '8h ago',   color: '#fff', textColor: '#000', letter: 'V' },
  { name: 'Figma',       role: 'Dev Tools Engineer',    score: 85, status: 'sent',     time: 'Yesterday',color: '#A259FF', letter: 'F' },
  { name: 'Notion',      role: 'API Integration Eng.',  score: 82, status: 'pending',  time: 'Yesterday',color: '#fff', textColor: '#000', letter: 'N' },
  { name: 'Supabase',    role: 'Database Engineer',     score: 79, status: 'sent',     time: '2d ago',   color: '#3ECF8E', textColor: '#000', letter: 'S' },
  { name: 'GitHub',      role: 'Developer Experience',  score: 76, status: 'viewed',   time: '3d ago',   color: '#fff', textColor: '#000', letter: 'G' },
  { name: 'Tailscale',   role: 'Infra Engineer',        score: 74, status: 'sent',     time: '4d ago',   color: '#4B9ED6', letter: 'T' },
  { name: 'Planetscale', role: 'Backend Engineer',      score: 71, status: 'pending',  time: '5d ago',   color: '#FF6C44', letter: 'P' },
  { name: 'Clerk',       role: 'Full-Stack Engineer',   score: 68, status: 'sent',     time: '1w ago',   color: '#6C47FF', letter: 'C' },
]

export const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_064122_c4750c0e-7476-4b44-94a2-a85a65c63bf2.mp4'
