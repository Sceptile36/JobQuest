import type {
  User,
  Resume,
  Preferences,
  WatchlistEntry,
  Platform,
  Draft,
  Application,
  Job,
} from '@/types'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

// ── Low-level fetch wrapper ────────────────────────────────────────
async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

// ── Users ──────────────────────────────────────────────────────────
export const createUser = (name: string, email: string) =>
  request<User>('/users', {
    method: 'POST',
    body: JSON.stringify({ name, email }),
  })

// ── Resumes ────────────────────────────────────────────────────────
export const uploadResume = async (file: File, userId: string): Promise<Resume> => {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('user_id', userId)
  const res = await fetch(`${BASE}/resumes/upload`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`)
  return res.json()
}

export const savePreferences = (resumeId: string, prefs: Preferences) =>
  request<Resume>(`/resumes/${resumeId}/preferences`, {
    method: 'PATCH',
    body: JSON.stringify(prefs),
  })

// ── Watchlist ──────────────────────────────────────────────────────
export const getWatchlist = (resumeId: string) =>
  request<{ companies: WatchlistEntry[] }>(`/watchlist?resume_id=${resumeId}`)

export const addToWatchlist = (resumeId: string, slug: string, platform: Platform) =>
  request<WatchlistEntry>('/watchlist', {
    method: 'POST',
    body: JSON.stringify({ resume_id: resumeId, slug, platform }),
  })

export const removeFromWatchlist = (id: string) =>
  request<void>(`/watchlist/${id}`, { method: 'DELETE' })


// ── Discovered Jobs ───────────────────────────────────────────────
export const getJobs = (resumeId: string) =>
  request<{ jobs: Job[] }>(`/jobs?resume_id=${resumeId}`)

// ── Drafts ─────────────────────────────────────────────────────────
export const getDrafts = (resumeId: string, status?: string) => {
  const qs = status ? `&status=${status}` : ''
  return request<{ drafts: Draft[] }>(`/drafts?resume_id=${resumeId}${qs}`)
}

export const approveDraft = (draftId: string) =>
  request<Draft>(`/drafts/${draftId}/approve`, { method: 'POST' })

export const rejectDraft = (draftId: string, feedback: string) =>
  request<Draft>(`/drafts/${draftId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ feedback }),
  })

// ── Applications ───────────────────────────────────────────────────
export const getApplications = (resumeId: string) =>
  request<{ applications: Application[] }>(`/applications?resume_id=${resumeId}`)
