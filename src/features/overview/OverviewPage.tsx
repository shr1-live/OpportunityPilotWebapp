import { Link } from 'react-router-dom'
import { ErrorNotice } from '../../components/ErrorNotice'
import { StatusBadge } from '../../components/StatusBadge'
import { PageHeader } from '../../components/PageHeader'
import type { Overview } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { useShell } from '../shell/ShellContext'
import { SampleRunCard } from './SampleRunCard'

/** Every figure here comes from the API. Entities that do not exist in this build are not counted. */
export function OverviewPage() {
  const overview = useApi<Overview>('/api/v1/overview')
  const { capabilities } = useShell()
  const profiles = overview.data?.profiles
  const applied = overview.data?.applied
  const needsManual = overview.data?.needsManual
  const campaigns = overview.data?.campaigns
  const shortlisted = overview.data?.shortlisted
  const awaitingApproval = overview.data?.awaitingApproval
  const pending = overview.loading && !overview.data
  const hasProfile = (profiles ?? 0) > 0

  return (
    <div className="page stack-6">
      <PageHeader
        title="Your opportunity workspace"
        subtitle={
          hasProfile
            ? 'Your profiles are ready for campaigns. Nothing is researched until you queue a run.'
            : 'Nothing has been researched yet. Start by describing what you offer — you can stop after any step.'
        }
      />

      {overview.error && <ErrorNotice error={overview.error} onRetry={overview.reload} />}

      <SampleRunCard />

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
              <h3 className="section-heading">Set up the apply agent</h3>
              <span className="badge badge-primary">Beta</span>
            </div>
            <p className="muted-small">
              Apply to LinkedIn and Naukri jobs from your own logged-in browser, using only your saved answers. It starts
              in dry-run mode and submits nothing until you say so.
            </p>
            <Link className="btn btn-secondary btn-sm" to="/applications">
              Set up agent
            </Link>
          </div>
        </li>
        <li className={`card step ${campaigns ? 'step-done' : ''}`}>
          <span className="step-num" aria-hidden="true">3</span>
          <div className="stack-2">
            <div className="row">
              <h3 className="section-heading">Start a campaign</h3>
              {(campaigns ?? 0) > 0 && <span className="badge badge-success">Done</span>}
            </div>
            <p className="muted-small">Describe a goal, enter your criteria and sources, then queue the run.</p>
            <Link className={`btn ${hasProfile && !campaigns ? 'btn-primary' : 'btn-secondary'} btn-sm`} to="/campaigns/new">
              New campaign
            </Link>
          </div>
        </li>
      </ol>

      <div className="stat-grid">
        <section className="card stat">
          <div className="stat-label">Profiles</div>
          <div className="stat-value op-numeric">{profiles ?? '—'}</div>
          <div className="muted-small">{pending ? 'Loading…' : 'Owned by your account'}</div>
        </section>
        <section className="card stat">
          <div className="stat-label">Campaigns</div>
          <div className="stat-value op-numeric">{campaigns ?? '—'}</div>
          <div className="muted-small">{pending ? 'Loading…' : <Link to="/campaigns">Research setups you own</Link>}</div>
        </section>
        <section className="card stat">
          <div className="stat-label">Awaiting approval</div>
          <div className={`stat-value op-numeric ${awaitingApproval ? 'text-warning' : ''}`}>{awaitingApproval ?? '—'}</div>
          <div className="muted-small">
            {pending ? 'Loading…' : <Link to="/approvals">Suggested jobs to approve or reject</Link>}
          </div>
        </section>
        <section className="card stat">
          <div className="stat-label">Shortlisted</div>
          <div className="stat-value op-numeric">{shortlisted ?? '—'}</div>
          <div className="muted-small">{pending ? 'Loading…' : <Link to="/opportunities">Opportunities you picked</Link>}</div>
        </section>
        <section className="card stat">
          <div className="stat-label">Applications sent</div>
          <div className="stat-value op-numeric">{applied ?? '—'}</div>
          <div className="muted-small">
            {pending ? 'Loading…' : <Link to="/applications">Via the local agent</Link>}
          </div>
        </section>
        <section className="card stat">
          <div className="stat-label">Need your input</div>
          <div className={`stat-value op-numeric ${needsManual ? 'text-warning' : ''}`}>{needsManual ?? '—'}</div>
          <div className="muted-small">{pending ? 'Loading…' : 'Questions your saved answers don’t cover'}</div>
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
              .filter((c) => ['database', 'auth', 'linkedin', 'naukri'].includes(c.key))
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
