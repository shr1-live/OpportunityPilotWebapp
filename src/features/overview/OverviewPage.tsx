import { Link } from 'react-router-dom'
import { ErrorNotice } from '../../components/ErrorNotice'
import { StatusBadge } from '../../components/StatusBadge'
import type { Overview } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { useShell } from '../shell/ShellContext'

/** Every figure here comes from the API. Entities that do not exist in this build are not counted. */
export function OverviewPage() {
  const overview = useApi<Overview>('/api/v1/overview')
  const { capabilities } = useShell()
  const profiles = overview.data?.profiles
  const hasProfile = (profiles ?? 0) > 0

  return (
    <div className="page stack-6">
      <div className="page-head">
        <div>
          <h2 className="page-title">Your opportunity workspace</h2>
          <p className="page-sub">
            {hasProfile
              ? 'Your profiles are ready for campaigns. Research arrives in a later milestone; nothing is searched yet.'
              : 'Nothing has been researched yet. Start by describing what you offer — you can stop after any step.'}
          </p>
        </div>
      </div>

      {overview.error && <ErrorNotice error={overview.error} onRetry={overview.reload} />}

      <ol className="steps plain-list">
        <li className={`card step ${hasProfile ? 'step-done' : ''}`}>
          <span className="step-num" aria-hidden="true">1</span>
          <div className="stack-2">
            <div className="row">
              <h3 className="section-heading">Add a profile</h3>
              {hasProfile && <span className="badge badge-success">Done</span>}
            </div>
            <p className="muted-small">
              Describe what you sell, build or offer. Campaigns judge fit against it — nothing is invented for you.
            </p>
            <Link className={`btn ${hasProfile ? 'btn-secondary' : 'btn-primary'} btn-sm`} to="/profiles">
              {hasProfile ? 'Review profiles' : 'Add profile'}
            </Link>
          </div>
        </li>
        <li className="card step">
          <span className="step-num" aria-hidden="true">2</span>
          <div className="stack-2">
            <div className="row">
              <h3 className="section-heading">Connect sources</h3>
              <span className="badge badge-neutral">Not built yet · M2–M3</span>
            </div>
            <p className="muted-small">CSV import, public company URLs and permitted feeds. See what each source can do today.</p>
            <Link className="btn btn-secondary btn-sm" to="/integrations">
              View sources
            </Link>
          </div>
        </li>
        <li className="card step">
          <span className="step-num" aria-hidden="true">3</span>
          <div className="stack-2">
            <div className="row">
              <h3 className="section-heading">Start a campaign</h3>
              <span className="badge badge-neutral">Not built yet · M2</span>
            </div>
            <p className="muted-small">Describe a goal, confirm the parsed criteria, then queue the run.</p>
          </div>
        </li>
      </ol>

      <div className="stat-grid">
        <section className="card stat">
          <div className="stat-label">Profiles</div>
          <div className="stat-value op-numeric">{profiles ?? '—'}</div>
          <div className="muted-small">{overview.loading && profiles === undefined ? 'Loading…' : 'Owned by your account'}</div>
        </section>
        <section className="card stat">
          <div className="stat-label">Opportunities</div>
          <div className="stat-value stat-empty">None yet</div>
          <div className="muted-small">Matches appear with their evidence once research exists.</div>
        </section>
        <section className="card stat">
          <div className="stat-label">Drafts awaiting review</div>
          <div className="stat-value stat-empty">None yet</div>
          <div className="muted-small">Outreach always needs your approval before it can be sent.</div>
        </section>
      </div>

      {capabilities && (
        <section className="card stack-3">
          <div className="row">
            <h3 className="section-heading">What this deployment can do</h3>
            <div className="grow" />
            <Link to="/integrations" className="small">
              All sources and integrations
            </Link>
          </div>
          <ul className="plain-list cap-mini">
            {capabilities.items
              .filter((c) => ['database', 'gemini', 'csv-import', 'gmail'].includes(c.key))
              .map((c) => (
                <li key={c.key} className="row">
                  <span>{c.name}</span>
                  <div className="grow" />
                  <StatusBadge status={c.status} />
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  )
}
