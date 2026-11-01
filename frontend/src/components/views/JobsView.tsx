import { useState, useEffect } from 'react'
import { getJobs } from '@/lib/api'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Job } from '@/types'
import { timeAgo } from '@/lib/utils'

interface Props {
  resumeId: string | null
}

export function JobsView({ resumeId }: Props) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!resumeId) {
      setFetching(false)
      return
    }

    setFetching(true)
    setError('')

    getJobs(resumeId)
      .then((d) => setJobs(d.jobs ?? []))
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Failed to load jobs.')
      )
      .finally(() => setFetching(false))
  }, [resumeId])

  return (
    <div className="max-w-3xl mx-auto py-7 px-4">
      <SectionHeader
        eyebrow="JOBS"
        tag="FROM DATABASE"
        title="Discovered Jobs"
        subtitle="Listings the agent found for your preferences, read from PostgreSQL."
      />

      {error && (
        <p className="text-[12px] text-rose-400 font-mono mb-3">
          ✕ {error}
        </p>
      )}

      {fetching ? (
        <Skeleton rows={5} />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon="◎"
          message="No jobs yet. Run the agent from Resume & Prefs first."
        />
      ) : (
        <div className="liquid-glass rounded-[10px] overflow-hidden">
          <table className="w-full text-left text-[12px]">
            <thead className="text-white/40 font-mono text-[10px] uppercase">
              <tr>
                <th className="px-3.5 py-2.5">Title</th>
                <th className="px-3.5 py-2.5">Company</th>
                <th className="px-3.5 py-2.5">Location</th>
                <th className="px-3.5 py-2.5">Found</th>
                <th className="px-3.5 py-2.5">Apply</th>
              </tr>
            </thead>

            <tbody>
              {jobs.map((j) => (
                <tr
                  key={j.id}
                  className="border-t border-white/[0.06]"
                >
                  <td className="px-3.5 py-2.5 font-semibold">
                    {j.title || 'Untitled role'}
                  </td>

                  <td className="px-3.5 py-2.5">
                    {j.company || 'Unknown company'}
                  </td>

                  <td className="px-3.5 py-2.5 text-white/50">
                    {j.location || '—'}
                  </td>

                  <td className="px-3.5 py-2.5 text-white/30 font-mono">
                    {j.found_at ? timeAgo(j.found_at) : '—'}
                  </td>

                  <td className="px-3.5 py-2.5">
                    {j.jd_url ? (
                      <a
                        href={j.jd_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#3D81E3] hover:underline"
                      >
                        Open →
                      </a>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}