import { useState, useRef } from 'react'
import { motion } from 'motion/react'
import { createUser, uploadResume, savePreferences } from '@/lib/api'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Btn } from '@/components/ui/Btn'
import { Field } from '@/components/ui/Field'
import type { AppCtx, Preferences } from '@/types'

interface Props {
  ctx: AppCtx
  onComplete: (ctx: AppCtx) => void
  onNavigate: (view: 'watchlist' | 'drafts' | 'jobs') => void
  isComplete: boolean
}

const STEPS = [
  { title: 'Create your account',   subtitle: 'One-time setup. Your profile personalises every outreach email.' },
  { title: 'Upload your resume',    subtitle: 'PDF format · max 10 MB. The extractor agent pulls skills, experience, and education.' },
  { title: 'Set your preferences',  subtitle: 'The agent scores every job posting against these before drafting outreach.' },
]

export function OnboardView({ ctx, onComplete, onNavigate, isComplete }: Props) {
  const [step, setStep]     = useState(ctx.userId ? (ctx.resumeId ? 2 : 1) : 0)
  const [name, setName]     = useState('')
  const [email, setEmail]   = useState('')
  const [file, setFile]     = useState<File | null>(null)
  const [prefs, setPrefs]   = useState<Preferences>({ field: '', role: '', salary: '', location: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Local ctx that may not be persisted yet
  const [localCtx, setLocalCtx] = useState<AppCtx>(ctx)

  async function handleRegister() {
    if (!name.trim() || !email.trim()) { setError('Name and email are required.'); return }
    setLoading(true); setError('')
    try {
      const user = await createUser(name.trim(), email.trim())
      const next = { ...localCtx, userId: user.id }
      setLocalCtx(next)
      setStep(1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally { setLoading(false) }
  }

  async function handleUpload() {
    if (!file) { setError('Please select a PDF resume.'); return }
    if (!localCtx.userId) { setError('Complete step 1 first.'); return }
    setLoading(true); setError('')
    try {
      const resume = await uploadResume(file, localCtx.userId)
      const next = { ...localCtx, resumeId: resume.resume_id }
      setLocalCtx(next)
      setStep(2)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.')
    } finally { setLoading(false) }
  }

  async function handlePrefs() {
    if (!prefs.field || !prefs.role) { setError('Field and role are required.'); return }
    if (!localCtx.resumeId) { setError('Upload your resume first.'); return }
    setLoading(true); setError('')
    try {
      await savePreferences(localCtx.resumeId, prefs)
      onComplete(localCtx)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save preferences.')
    } finally { setLoading(false) }
  }

  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-full text-center px-8"
      >
        <div className="text-5xl mb-4">🚀</div>
        <h2 className="text-[20px] font-bold mb-2">Agent is running</h2>
        <p className="text-[13px] text-white/45 max-w-xs mb-6 leading-relaxed">
          Resume parsed. Preferences saved. The agent is searching for jobs matching your preferences.
        </p>
        <div className="flex gap-3">
          <Btn onClick={() => onNavigate('jobs')}>View Jobs →</Btn>
          <Btn variant="ghost" onClick={() => onNavigate('watchlist')}>
            Go to Watchlist
          </Btn>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <SectionHeader
        eyebrow="SETUP"
        tag={`STEP ${step + 1} OF 3`}
        title="Get started with JobAgent"
        subtitle="3 quick steps. The agent does the rest."
      />

      {/* Progress bar */}
      <div className="flex gap-1.5 mb-5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[3px] flex-1 rounded-full transition-colors duration-300"
            style={{ background: i <= step ? '#3D81E3' : 'rgba(255,255,255,0.1)' }}
          />
        ))}
      </div>

      {/* Steps */}
      {STEPS.map((s, i) => {
        const done   = i < step
        const active = i === step

        return (
          <div
            key={i}
            className="liquid-glass rounded-2xl p-5 mb-3.5"
            style={{ borderColor: active ? 'rgba(61,129,227,0.2)' : 'rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-start gap-3.5">
              {/* Step number / check */}
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-[2px]
                           text-[12px] font-bold font-mono border"
                style={
                  done
                    ? { background: 'rgba(16,185,129,0.15)', color: '#10b981', borderColor: 'rgba(16,185,129,0.2)' }
                    : active
                    ? { background: 'rgba(61,129,227,0.15)', color: '#3D81E3', borderColor: 'rgba(61,129,227,0.2)' }
                    : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', borderColor: 'rgba(255,255,255,0.08)' }
                }
              >
                {done ? '✓' : i + 1}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold mb-[3px]">{s.title}</p>
                <p className="text-[12px] text-white/40 leading-relaxed mb-1">{s.subtitle}</p>
                {done && <p className="text-[11px] text-emerald-400 font-mono">✓ Completed</p>}

                {/* Step 0 — Register */}
                {active && i === 0 && (
                  <div className="mt-3 flex flex-col gap-3">
                    <Field label="Full name" placeholder="Alex Rivera" value={name} onChange={(e) => setName(e.target.value)} />
                    <Field label="Email" type="email" placeholder="alex@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <Btn onClick={handleRegister} loading={loading}>Continue →</Btn>
                  </div>
                )}

                {/* Step 1 — Upload */}
                {active && i === 1 && (
                  <div className="mt-3 flex flex-col gap-3">
                    <div
                      onClick={() => fileRef.current?.click()}
                      className={`border-[1.5px] rounded-xl p-7 text-center cursor-pointer
                                  transition-all duration-200
                                  ${file ? 'border-brand/70 bg-brand/[0.08]' : 'border-brand/35 bg-brand/[0.04] hover:border-brand/60 hover:bg-brand/[0.08]'}`}
                    >
                      <div className="text-3xl mb-2">📄</div>
                      <p className="text-[13px] font-medium text-white/70">
                        {file ? file.name : 'Drop PDF or click to browse'}
                      </p>
                      <p className="text-[11px] text-white/35 mt-1">
                        {file ? `${(file.size / 1024).toFixed(0)} KB · ready` : 'Supports .pdf up to 10 MB'}
                      </p>
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".pdf"
                        hidden
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      />
                    </div>
                    <Btn onClick={handleUpload} loading={loading}>Upload & Parse →</Btn>
                  </div>
                )}

                {/* Step 2 — Prefs */}
                {active && i === 2 && (
                  <div className="mt-3 flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      <Field label="Field" placeholder="Software Engineering"
                        value={prefs.field} onChange={(e) => setPrefs((p) => ({ ...p, field: e.target.value }))} />
                      <Field label="Target Role" placeholder="Backend Engineer"
                        value={prefs.role} onChange={(e) => setPrefs((p) => ({ ...p, role: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <Field label="Min Salary (USD/yr)" placeholder="120000"
                        value={prefs.salary} onChange={(e) => setPrefs((p) => ({ ...p, salary: e.target.value }))} />
                      <Field label="Location" placeholder="Remote / SF"
                        value={prefs.location} onChange={(e) => setPrefs((p) => ({ ...p, location: e.target.value }))} />
                    </div>
                    <Btn onClick={handlePrefs} loading={loading}>Save & Start Agent →</Btn>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {error && (
        <p className="mt-2 text-[12px] text-rose-400 font-mono">✕ {error}</p>
      )}
    </div>
  )
}
