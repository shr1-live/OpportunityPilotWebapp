import { Link } from 'react-router-dom'
import { ErrorNotice } from '../../components/ErrorNotice'
import { Badge } from '../../components/StatusBadge'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState, LoadingState } from '../../components/States'
import type { SalesProject } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { salesBidRows, salesBidStateLabel } from './salesModel'

export function SalesProposalsPage() {
  const projects = useApi<SalesProject[]>('/api/v1/sales/projects?take=200')
  const rows = salesBidRows(projects.data ?? []).filter(({ bid }) => bid.state === 'Draft' || bid.state === 'Approved')

  return (
    <div className="page page-wide stack-4">
      <PageHeader
        title="Proposals & bids"
        subtitle="Drafts and exact versions awaiting review. Editing an approved bid clears its approval."
        actions={<Link className="btn btn-primary" to="/projects">Open projects</Link>}
      />
      <p className="notice notice-warning">
        <strong>Nothing is submitted from this screen.</strong> Approved Upwork bids use a copy/open handoff until an official API or MCP connection is configured. You confirm placement only after submitting on the provider.
      </p>
      {projects.error ? <ErrorNotice error={projects.error} onRetry={projects.reload} what="proposal drafts" /> : null}
      {projects.loading && !projects.data ? <LoadingState label="Loading proposal drafts…" waking={projects.waking} rows={4} /> : null}
      {projects.data && rows.length === 0 ? (
        <EmptyState icon="◇" title="No proposal drafts yet" actions={<Link className="btn btn-primary btn-sm" to="/projects">Choose a project</Link>}>
          Add a project, then enter the amount, delivery window and proposal yourself.
        </EmptyState>
      ) : null}
      {rows.length > 0 ? (
        <section className="panel" aria-labelledby="proposal-list-heading">
          <header className="panel-head"><h3 id="proposal-list-heading" className="eyebrow">Current bid versions</h3></header>
          <div className="table-scroll" role="region" aria-labelledby="proposal-list-heading" tabIndex={0}>
            <table className="table">
              <caption className="sr-only">Draft and approved sales bids.</caption>
              <thead><tr><th>Project</th><th>Proposal</th><th>Amount</th><th>State</th><th><span className="sr-only">Action</span></th></tr></thead>
              <tbody>{rows.map(({ project, bid }) => (
                <tr key={bid.id}>
                  <td className="table-role"><Link to={`/projects/${project.id}`}>{project.title}</Link>{project.buyer ? <div className="muted-small">{project.buyer}</div> : null}</td>
                  <td><span className="clamp-2">{bid.proposal}</span><div className="muted-small">Version {bid.version}</div></td>
                  <td>{bid.amount.toLocaleString()} {bid.currency}<div className="muted-small">{bid.deliveryDays} days</div></td>
                  <td><Badge tone={bid.hasValidApproval ? 'success' : 'neutral'}>{salesBidStateLabel(bid.state)}</Badge></td>
                  <td><Link to={`/projects/${project.id}`}>{bid.hasValidApproval ? 'Review' : 'Edit and approve'}</Link></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}
