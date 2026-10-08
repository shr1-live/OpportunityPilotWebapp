import { Link } from 'react-router-dom'
import { ErrorNotice } from '../../components/ErrorNotice'
import { StatusBadge } from '../../components/StatusBadge'
import { PageHeader } from '../../components/PageHeader'
import { LoadingState } from '../../components/States'
import type { Capabilities, Capability } from '../../lib/types'
import { useApi } from '../../lib/useApi'

const CATEGORY_ORDER = ['Core', 'AI', 'Sources', 'Outreach', 'Platforms', 'Optional']

function groupByCategory(items: Capability[]) {
  const groups = new Map<string, Capability[]>()
  for (const item of items) groups.set(item.category, [...(groups.get(item.category) ?? []), item])
  return [...groups.entries()].sort(
    ([a], [b]) => (CATEGORY_ORDER.indexOf(a) + 1 || 99) - (CATEGORY_ORDER.indexOf(b) + 1 || 99),
  )
}

/** Where a card's one action goes, for capabilities the app can act on itself. Never a dead link. */
const CARD_ACTIONS: Record<string, { label: string; to: string }> = {
  greenhouse: { label: 'Manage boards', to: '/campaigns' },
  lever: { label: 'Manage boards', to: '/campaigns' },
  linkedin: { label: 'Set up the agent', to: '/applications' },
  naukri: { label: 'Set up the agent', to: '/applications' },
  'csv-import': { label: 'Add to a campaign', to: '/campaigns' },
  'public-urls': { label: 'Add to a campaign', to: '/campaigns' },
  feeds: { label: 'Add to a campaign', to: '/campaigns' },
  'job-boards': { label: 'Open Job discovery', to: '/wellfound' },
}

function statusCounts(items: Capability[]) {
  const ready = items.filter((c) => c.status === 'Ready').length
  const notConfigured = items.filter((c) => c.status === 'NotConfigured').length
  const notBuilt = items.filter((c) => c.status === 'NotBuilt').length
  return { ready, notConfigured, notBuilt }
}

/** Renders /api/v1/capabilities as-is: each row states what the integration can and cannot actually do. */
export function IntegrationsPage() {
  const caps = useApi<Capabilities>('/api/v1/capabilities')

  return (
    <div className="page page-wide stack-4">
      <PageHeader
        title="Sources & integrations"
        subtitle={
          <>
            Each card says what the integration <strong>can</strong> and <strong>cannot</strong> do in this build. “Ready” is reserved
            for something that works today; keys and secrets live in server configuration and are never shown here.
          </>
        }
        actions={
          caps.data && (
            <span className="row wrap">
              <span className="badge badge-success">Ready {statusCounts(caps.data.items).ready}</span>
              <span className="badge badge-warning">Not configured {statusCounts(caps.data.items).notConfigured}</span>
              <span className="badge">Not built yet {statusCounts(caps.data.items).notBuilt}</span>
            </span>
          )
        }
      />

      {caps.error && <ErrorNotice error={caps.error} onRetry={caps.reload} />}
      {caps.loading && !caps.data && <LoadingState label="Loading capabilities…" waking={caps.waking} rows={5} />}

      {caps.data && (
        <>
          <dl className="facts card">
            <div>
              <dt>Environment</dt>
              <dd>{caps.data.environment}</dd>
            </div>
            <div>
              <dt>Database</dt>
              <dd>{caps.data.databaseProvider}</dd>
            </div>
            <div>
              <dt>AI mode</dt>
              <dd>{caps.data.aiMode}</dd>
            </div>
          </dl>

          {groupByCategory(caps.data.items).map(([category, items]) => (
            <section key={category} className="stack-2">
              <h3 className="eyebrow">{category}</h3>
              <ul className="plain-list cap-grid">
                {items.map((c) => (
                  <li key={c.key} className="card cap">
                    <div className="row wrap">
                      <h4 className="cap-name">{c.name}</h4>
                      <div className="grow" />
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="muted-small">{c.detail}</p>
                    {(c.can.length > 0 || c.cannot.length > 0) && (
                      <ul className="plain-list cap-list cap-list-v">
                        {c.can.map((x) => (
                          <li key={`can-${x}`} className="cap-can">
                            <span className="sr-only">Can: </span>
                            {x}
                          </li>
                        ))}
                        {c.cannot.map((x) => (
                          <li key={`cannot-${x}`} className="cap-cannot">
                            <span className="sr-only">Cannot yet: </span>
                            {x}
                          </li>
                        ))}
                      </ul>
                    )}
                    {CARD_ACTIONS[c.key] && (
                      <Link className="btn btn-secondary btn-sm cap-action" to={CARD_ACTIONS[c.key].to}>
                        {CARD_ACTIONS[c.key].label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  )
}
