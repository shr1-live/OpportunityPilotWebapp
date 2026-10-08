import { ErrorNotice } from '../../components/ErrorNotice'
import { LoadingState } from '../../components/States'
import { Badge } from '../../components/StatusBadge'
import { useApi } from '../../lib/useApi'
import { safeHref } from '../opportunities/opportunityModel'
import { BOARDS, employmentLabel, formatSalary, type BoardSearchResult, type JobBoard } from './boardModel'

/** Live postings from one job board (through the licensed JSearch aggregator). Read-only; each row links to the board. */
export function BoardLiveResults({ board, path }: { board: JobBoard; path: string | null }) {
  const result = useApi<BoardSearchResult>(path)
  const name = BOARDS[board].name
  if (!path) return null
  if (result.error) return <ErrorNotice error={result.error} onRetry={result.reload} what={`live ${name} jobs`} />
  if (!result.data) return <LoadingState label={`Fetching live ${name} jobs…`} waking={result.waking} />
  const r = result.data
  if (r.status !== 'Ready') {
    return <section className="notice notice-neutral row wrap">
      <Badge tone="warning">{r.status === 'NotConfigured' ? 'Live listings not set up' : 'Live listings unavailable'}</Badge>
      <span className="grow">{r.message} You can still open the search on {name} above.</span>
    </section>
  }
  const observed = r.observedAt ? new Date(r.observedAt).toLocaleString() : ''
  return <section className="panel">
    <header className="panel-head">
      <div>
        <h3 className="eyebrow">{r.jobs.length} live {name} jobs</h3>
        <p className="muted-small">From {r.source}. {r.jobs.length} of {r.providerResults} matching postings are published on {name}. Retrieved {observed}{r.fromCache ? ' (saved copy, refreshed every few hours to stay within the free quota)' : ''}.</p>
      </div>
      <span className="grow" />
      <Badge tone="success">Live</Badge>
    </header>
    {r.jobs.length === 0
      ? <div className="panel-body"><p className="muted-small">{r.message}</p></div>
      : <ul className="board-results">
        {r.jobs.map((job) => {
          const salary = formatSalary(job)
          const href = safeHref(job.boardUrl) ?? undefined
          return <li key={job.providerJobId} className="board-result">
            <div className="grow">
              <a href={href} target="_blank" rel="noopener noreferrer"><strong>{job.title}</strong><span className="sr-only"> (opens on {name} in a new tab)</span></a>
              <div className="muted-small">{[job.companyName, job.location, job.isRemote ? 'Remote' : null, employmentLabel(job.employmentType)].filter(Boolean).join(' · ')}</div>
              {job.snippet ? <p className="muted-small board-snippet">{job.snippet}</p> : null}
            </div>
            <div className="board-meta">
              {salary ? <span className="op-numeric">{salary}</span> : null}
              {job.postedAt ? <span className="muted-small">Posted {new Date(job.postedAt).toLocaleDateString()}</span> : null}
              <a className="btn btn-secondary btn-sm" href={href} target="_blank" rel="noopener noreferrer">Open on {name} ↗</a>
            </div>
          </li>
        })}
      </ul>}
  </section>
}
