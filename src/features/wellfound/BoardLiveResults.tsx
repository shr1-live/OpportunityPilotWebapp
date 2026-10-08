import { ErrorNotice } from '../../components/ErrorNotice'
import { LoadingState } from '../../components/States'
import { Badge } from '../../components/StatusBadge'
import { useApi } from '../../lib/useApi'
import { safeHref } from '../opportunities/opportunityModel'
import { BOARDS, employmentLabel, formatSalary, type BoardSearchResult, type JobBoard } from './boardModel'

/** Live postings from one job board (through the licensed JSearch aggregator). Read-only; each card links to the board. */
export function BoardLiveResults({ board, path, searchUrl }: { board: JobBoard; path: string | null; searchUrl: string }) {
  const result = useApi<BoardSearchResult>(path)
  const name = BOARDS[board].name
  if (!path) return null
  if (result.error) return <ErrorNotice error={result.error} onRetry={result.reload} what={`live ${name} jobs`} />
  if (!result.data) return <LoadingState label={`Fetching live ${name} jobs…`} waking={result.waking} />
  const r = result.data
  if (r.status !== 'Ready') {
    return <section className="result-blocked">
      <Badge tone="warning">{r.status === 'NotConfigured' ? 'Live listings not set up' : 'Live listings unavailable'}</Badge>
      <p className="grow">{r.message}</p>
      <a className="btn btn-secondary btn-sm" href={searchUrl} target="_blank" rel="noopener noreferrer">See these results on {name} ↗<span className="sr-only"> (opens in a new tab)</span></a>
    </section>
  }
  const observed = r.observedAt ? new Date(r.observedAt).toLocaleString() : ''
  return <section aria-label={`Live ${name} jobs`} className="stack-3">
    <div className="results-head">
      <h3 className="results-title">{r.jobs.length} live {name} job{r.jobs.length === 1 ? '' : 's'}</h3>
      <Badge tone="success">Live</Badge>
      <span className="grow" />
      <span className="muted-small">{r.jobs.length} of {r.providerResults} matches are on {name} · retrieved {observed}{r.fromCache ? ' (cached)' : ''}</span>
    </div>
    {r.jobs.length === 0
      ? <p className="muted-small">{r.message}</p>
      : <ul className="result-list">
        {r.jobs.map((job) => {
          const salary = formatSalary(job)
          const href = safeHref(job.boardUrl) ?? undefined
          return <li key={job.providerJobId} className="result-card">
            <div className="result-main">
              <a className="result-title" href={href} target="_blank" rel="noopener noreferrer">{job.title}<span className="sr-only"> (opens on {name} in a new tab)</span></a>
              <div className="result-sub">{[job.companyName, job.location, job.isRemote ? 'Remote' : null, employmentLabel(job.employmentType)].filter(Boolean).join(' · ')}</div>
              {job.snippet ? <p className="result-snippet">{job.snippet}</p> : null}
            </div>
            <div className="result-side">
              {salary ? <strong className="op-numeric">{salary}</strong> : null}
              {job.postedAt ? <span className="muted-small">Posted {new Date(job.postedAt).toLocaleDateString()}</span> : null}
              <a className="btn btn-secondary btn-sm" href={href} target="_blank" rel="noopener noreferrer">Open on {name} ↗</a>
            </div>
          </li>
        })}
      </ul>}
  </section>
}
