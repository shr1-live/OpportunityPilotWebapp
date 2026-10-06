import { Link } from 'react-router-dom'
import { ErrorNotice } from '../../components/ErrorNotice'
import { Badge } from '../../components/StatusBadge'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState, LoadingState } from '../../components/States'
import type { SalesProject } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { salesBidRows } from './salesModel'

export function SalesBidsPage() {
  const projects = useApi<SalesProject[]>('/api/v1/sales/projects?take=200')
  const rows = salesBidRows(projects.data ?? [])
  const placed = rows.filter(({ bid }) => bid.state === 'Placed')
  const approved = rows.filter(({ bid }) => bid.hasValidApproval)

  return (
    <div className="page page-wide stack-4">
      <PageHeader title="Bids sent" subtitle="Placed bids appear here only after a provider confirms submission." />
      {projects.error ? <ErrorNotice error={projects.error} onRetry={projects.reload} what="placed bids" /> : null}
      {projects.loading && !projects.data ? <LoadingState label="Loading placed bids…" waking={projects.waking} rows={4} /> : null}
      {projects.data && placed.length === 0 ? (
        <EmptyState icon="◇" title="No bids have been sent" actions={<Link className="btn btn-primary btn-sm" to="/proposals">Review proposals</Link>}>
          {approved.length > 0
            ? `${approved.length} approved ${approved.length === 1 ? 'bid is' : 'bids are'} waiting for the Freelancer placement integration.`
            : 'Prepare and approve a bid first. Provider placement is still pending N5 work.'}
        </EmptyState>
      ) : null}
      {placed.length > 0 ? (
        <section className="panel" aria-labelledby="placed-bids-heading">
          <header className="panel-head"><h3 id="placed-bids-heading" className="eyebrow">Provider-confirmed bids</h3></header>
          <div className="table-scroll" role="region" aria-labelledby="placed-bids-heading" tabIndex={0}>
            <table className="table">
              <caption className="sr-only">Bids confirmed as placed by a provider.</caption>
              <thead><tr><th>Project</th><th>Amount</th><th>Delivery</th><th>State</th></tr></thead>
              <tbody>{placed.map(({ project, bid }) => (
                <tr key={bid.id}>
                  <td className="table-role"><Link to={`/projects/${project.id}`}>{project.title}</Link>{project.buyer ? <div className="muted-small">{project.buyer}</div> : null}</td>
                  <td>{bid.amount.toLocaleString()} {bid.currency}</td>
                  <td>{bid.deliveryDays} days</td>
                  <td><Badge tone="success">Placed</Badge></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}
