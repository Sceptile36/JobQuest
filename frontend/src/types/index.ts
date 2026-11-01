// ── User & Resume ──────────────────────────────────────────────────
export interface User {
  id: string
  name: string
  email: string
  created_at: string
}

export interface Resume {
  resume_id: string
  user_id: string
  filename: string
  parsed: boolean
  skills: string[]
  created_at: string
}

export interface Preferences {
  field: string
  role: string
  salary: string
  location: string
}

// ── Watchlist ──────────────────────────────────────────────────────
// ── Discovered job (from PostgreSQL) ───────────────────────────────
export interface Job {
  id: string
  resume_id: string
  title: string | null
  company: string | null
  location: string | null
  jd_url: string | null
  source: string | null
  match_score: number | null
  found_at: string | null
}

export type Platform = 'greenhouse' | 'lever'

export interface WatchlistEntry {
  id: string
  resume_id: string
  slug: string
  platform: Platform
  last_scanned: string | null
}

// ── Job Posting ────────────────────────────────────────────────────
export interface JobPosting {
  id: string
  company: string
  title: string
  url: string
  platform: Platform
  match_score: number
  keywords: string[]
  created_at: string
}

// ── Draft ──────────────────────────────────────────────────────────
export type DraftStatus = 'pending' | 'approved' | 'rewriting' | 'rejected'

export interface Draft {
  id: string
  resume_id: string
  job_posting_id: string
  subject: string
  body: string
  poc_name: string | null
  poc_email: string | null
  poc_confidence: 'high' | 'low'
  status: DraftStatus
  version: number
  match_score: number
  company: string
  job_title: string
  created_at: string
}

// ── Application (sent outreach) ────────────────────────────────────
export type ApplicationStatus = 'sent' | 'viewed' | 'replied' | 'pending'

export interface Application {
  id: string
  resume_id: string
  draft_id: string
  company: string
  job_title: string
  poc_email: string | null
  poc_name: string | null
  match_score: number
  status: ApplicationStatus
  sent_at: string | null
  created_at: string
}

// ── Applied company (right panel) ─────────────────────────────────
export interface AppliedCompany {
  name: string
  role: string
  score: number
  status: ApplicationStatus
  time: string
  color: string
  textColor?: string
  letter: string
}

// ── Navigation ─────────────────────────────────────────────────────
export type ViewId = 'onboard' | 'watchlist' | 'jobs' | 'drafts' | 'history'

export interface NavItem {
  id: ViewId
  label: string
  icon: string
  badge?: string
  badgeVariant?: 'amber' | 'green'
}

// ── Pipeline ───────────────────────────────────────────────────────
export type PipelineStepId =
  | 'upload'
  | 'scan'
  | 'score'
  | 'contact'
  | 'draft'
  | 'approve'
  | 'sent'

export interface PipelineStep {
  id: PipelineStepId
  label: string
  icon: string
}

// ── WebSocket messages ─────────────────────────────────────────────
export interface WsNewDraft {
  type: 'new_draft'
  draft: Draft
}

export interface WsPipelineUpdate {
  type: 'pipeline_update'
  step: PipelineStepId
  message: string
}

export type WsMessage = WsNewDraft | WsPipelineUpdate

// ── App context state ──────────────────────────────────────────────
export interface AppCtx {
  userId: string | null
  resumeId: string | null
}
