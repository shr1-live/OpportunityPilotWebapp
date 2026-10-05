import { Link } from 'react-router-dom'
import { ErrorNotice } from '../../components/ErrorNotice'
import { Badge } from '../../components/StatusBadge'
import { PageHeader } from '../../components/PageHeader'
import type { CampaignSummary, ProfileSummary } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { formatWhen } from '../applications/applicationStatus'
import { JOB_STATE_LABELS } from '../research/researchModel'
import { MODE_LABELS } from './campaignModel'

const FLOW = [
  { title: 'Goal and mode', text: 'Pick a profile, choose Jobs or Customers and describe what you are after.' },
  { title: 'Filters', text: 'Enter the skills, places, industries and exclusions a match must meet.' },
  { title: 'Sources', text: 'Paste postings, add public URLs or feeds, or import a CSV.' },
  { title: 'Review and run', text: 'Check the summary and queue a research run. Saving never runs it.' },
]

export function CampaignsPage() {
  const campaigns = useApi<CampaignSummary[]>('/api/v1/campaigns')
  const profiles = useApi<ProfileSummary[]>('/api/v1/profiles')
  const noProfiles = profiles.data?.length === 0

  return (
    <div className="page stack-6">
      <PageHeader
        title="Campaigns"
        subtitle="A campaign is one search: a profile, a mode, your criteria and the sources to read. Each run ranks what it finds against those criteria."
        actions={
          <Link className="btn btn-primary" to="/campaigns/new">
            New campaign
          </Link>
        }
      />

      {campaigns.error && <ErrorNotice error={campaigns.error} onRetry={campaigns.reload} />}
      {campaigns.loading && !campaigns.data && <p className="muted-small">Loading campaigns…</p>}

      {campaigns.data && campaigns.data.length === 0 && (
        <div className="empty">
          <div className="empty-title">No campaigns yet</div>
          <p className="empty-text">
            Nothing is researched until you build a campaign and queue a run. It takes four steps:
          </p>
          <ol className="flow-steps">
            {FLOW.map((s) => (
              <li key={s.title}>
                <strong>{s.title}</strong> — {s.text}
              </li>
            ))}
          </ol>
          {noProfiles ? (
            <>
              <p className="empty-text">A campaign judges fit against one of your profiles, so add a profile first.</p>
              <Link className="btn btn-primary" to="/profiles/new">
                Add a profile
              </Link>
            </>
          ) : (
            <Link className="btn btn-primary" to="/campaigns/new">
              New campaign
            </Link>
          )}
        </div>
      )}

      {campaigns.data && campaigns.data.length > 0 && (
        <section className="card table-card" aria-labelledby="campaigns-heading">
          <h3 id="campaigns-heading" className="sr-only">
            Your campaigns
          </h3>
          <div className="table-scroll" role="region" aria-labelledby="campaigns-heading" tabIndex={0}>
            <table className="table">
              <caption className="sr-only">Your campaigns, newest first.</caption>
              <thead>
                <tr>
                  <th scope="col">Campaign</th>
                  <th scope="col">Mode</th>
                  <th scope="col">Sources</th>
                  <th scope="col">Opportunities</th>
                  <th scope="col">Last run</th>
                  <th scope="col">Updated</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.data.map((c) => (
                  <tr key={c.id}>
                    <td className="table-role">
                      <Link to={`/campaigns/${c.id}/edit`}>{c.name}</Link>
                      {c.goal && <div className="muted-small clamp-2">{c.goal}</div>}
                    </td>
                    <td>
                      <Badge>{MODE_LABELS[c.mode] ?? c.mode}</Badge>
                    </td>
                    <td className="op-numeric">
                      <Link to={`/campaigns/${c.id}/edit?step=3`}>
                        {c.sourceCount}
                        <span className="sr-only"> sources for {c.name}</span>
                      </Link>
                    </td>
                    <td className="op-numeric">
                      <Link to={`/campaigns/${c.id}/opportunities`}>
                        {c.opportunityCount}
                        <span className="sr-only"> opportunities in {c.name}</span>
                      </Link>
                    </td>
                    <td>
                      {c.lastJob ? (
                        <Link to={`/research/${c.lastJob.id}`} className="row wrap">
                          <Badge tone={JOB_STATE_LABELS[c.lastJob.state]?.tone}>
                            {JOB_STATE_LABELS[c.lastJob.state]?.text ?? c.lastJob.state}
                          </Badge>
                          {c.lastJob.finishedAt && (
                            <time className="muted-small" dateTime={c.lastJob.finishedAt}>
                              {formatWhen(c.lastJob.finishedAt)}
                            </time>
                          )}
                        </Link>
                      ) : (
                        <span className="muted-small">Never run</span>
                      )}
                    </td>
                    <td className="table-when op-numeric">
                      <time dateTime={c.updatedAt}>{formatWhen(c.updatedAt)}</time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
