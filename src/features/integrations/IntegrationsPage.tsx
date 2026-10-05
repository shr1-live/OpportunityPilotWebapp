import { ErrorNotice } from '../../components/ErrorNotice'
import { StatusBadge } from '../../components/StatusBadge'
import { PageHeader } from '../../components/PageHeader'
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

/** Renders /api/v1/capabilities as-is: each row states what the integration can and cannot actually do. */
export function IntegrationsPage() {
  const caps = useApi<Capabilities>('/api/v1/capabilities')

  return (
    <div className="page stack-6">
      <PageHeader
        title="Sources & integrations"
        subtitle="Each row states what the integration can actually do in this build. “Ready” is reserved for something that works today; keys and secrets live in server configuration and are never shown here."
      />

      {caps.error && <ErrorNotice error={caps.error} onRetry={caps.reload} />}
      {caps.loading && !caps.data && <p className="muted-small">Loading capabilities…</p>}

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
            <section key={category} className="stack-3">
              <h3 className="section-heading">{category}</h3>
              <ul className="plain-list stack-3">
                {items.map((c) => (
                  <li key={c.key} className="card cap">
                    <div className="row wrap">
                      <h4 className="cap-name">{c.name}</h4>
                      <div className="grow" />
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="muted-small">{c.detail}</p>
                    {(c.can.length > 0 || c.cannot.length > 0) && (
                      <ul className="plain-list cap-list">
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
