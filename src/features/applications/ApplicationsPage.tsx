import { useState } from 'react'
import { ErrorNotice } from '../../components/ErrorNotice'
import { Badge } from '../../components/StatusBadge'
import { api } from '../../lib/api'
import type { ApplicationItem, ApplicationPage, ApplicationSummary } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { AgentSetup, AGENT_SETUP_ID } from './AgentSetup'
import { HowItWorks } from './HowItWorks'
import {
  appendUnique,
  type ApplicationFilters,
  applicationsPath,
  formatWhen,
  PLATFORM_FILTERS,
  STATUS_FILTERS,
  STATUS_LABELS,
} from './applicationStatus'

function showAgentSetup() {
  const target = document.getElementById(AGENT_SETUP_ID)
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  target?.focus({ preventScroll: true })
}

/** Everything here is reported by the user's own agent; nothing is shown until it has run. */
export function ApplicationsPage() {
  const summary = useApi<ApplicationSummary>('/api/v1/applications/summary')
  const [filters, setFilters] = useState<ApplicationFilters>({ status: '', platform: '' })
  // Bumped by Refresh: remounts the table so paging starts over with the latest rows.
  const [refreshes, setRefreshes] = useState(0)

  const refresh = () => {
    summary.reload()
    setRefreshes((n) => n + 1)
  }

  return (
    <div className="page stack-6">
      <div className="page-head">
        <div className="grow">
          <h2 className="page-title">Applications</h2>
          <p className="page-sub">
            Jobs the OpportunityPilot agent applied to from your own logged-in browser, plus the ones it skipped or needs
            you for.
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={refresh}>
          Refresh
        </button>
      </div>

      <SummaryStats summary={summary.data} loading={summary.loading} error={summary.error} onRetry={summary.reload} />

      <section className="stack-3" aria-labelledby="applications-heading">
        <h3 id="applications-heading" className="section-heading">
          Activity
        </h3>
        <div className="filters">
          <div className="field">
            <label htmlFor="filter-status">Status</label>
            <select
              id="filter-status"
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as ApplicationFilters['status'] }))}
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="filter-platform">Platform</label>
            <select
              id="filter-platform"
              value={filters.platform}
              onChange={(e) => setFilters((f) => ({ ...f, platform: e.target.value as ApplicationFilters['platform'] }))}
            >
              {PLATFORM_FILTERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {/* Keyed by filters so a change starts again from the first page. */}
        <ApplicationsTable key={`${filters.status}|${filters.platform}|${refreshes}`} filters={filters} />
      </section>

      <HowItWorks />
      <AgentSetup />
    </div>
  )
}

function SummaryStats({
  summary,
  loading,
  error,
  onRetry,
}: {
  summary: ApplicationSummary | undefined
  loading: boolean
  error: Error | undefined
  onRetry: () => void
}) {
  if (error && !summary) return <ErrorNotice error={error} onRetry={onRetry} />
  const pending = loading && !summary ? 'Loading…' : undefined

  return (
    <div className="stat-grid">
      <section className="card stat">
        <div className="stat-label">Applied</div>
        <div className="stat-value op-numeric">{summary?.applied ?? '—'}</div>
        <div className="muted-small">{pending ?? `${summary?.appliedLast7Days ?? 0} in the last 7 days`}</div>
      </section>
      <section className="card stat">
        <div className="stat-label">Needs you</div>
        <div className={`stat-value op-numeric ${summary?.needsManual ? 'text-warning' : ''}`}>
          {summary?.needsManual ?? '—'}
        </div>
        <div className="muted-small">{pending ?? 'Questions your saved answers don’t cover'}</div>
      </section>
      <section className="card stat">
        <div className="stat-label">Dry runs</div>
        <div className="stat-value op-numeric">{summary?.dryRun ?? '—'}</div>
        <div className="muted-small">{pending ?? 'Filled but not submitted'}</div>
      </section>
      <section className="card stat">
        <div className="stat-label">Last activity</div>
        {summary?.lastActivityAt ? (
          <div className="stat-value stat-empty">
            <time dateTime={summary.lastActivityAt}>{formatWhen(summary.lastActivityAt)}</time>
          </div>
        ) : (
          <div className="stat-value stat-empty">{summary ? 'No runs yet' : '—'}</div>
        )}
        <div className="muted-small">{pending ?? 'Last result the agent reported'}</div>
      </section>
    </div>
  )
}

function ApplicationsTable({ filters }: { filters: ApplicationFilters }) {
  const first = useApi<ApplicationPage>(applicationsPath(filters, 0))
  const [more, setMore] = useState<ApplicationItem[]>([])
  // Rows received from the server, duplicates included: the next offset must move past all of them.
  const [fetchedMore, setFetchedMore] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState<Error>()

  if (first.error && !first.data) return <ErrorNotice error={first.error} onRetry={first.reload} />
  if (!first.data) return <p className="muted-small">Loading applications…</p>

  const items = appendUnique(first.data.items, more)
  const total = first.data.total
  const firstCount = first.data.items.length
  const filtered = Boolean(filters.status || filters.platform)

  async function loadMore() {
    setLoadingMore(true)
    setMoreError(undefined)
    try {
      const page = await api<ApplicationPage>(applicationsPath(filters, firstCount + fetchedMore))
      setMore((m) => appendUnique(m, page.items))
      setFetchedMore((n) => n + page.items.length)
    } catch (e) {
      setMoreError(e as Error)
    } finally {
      setLoadingMore(false)
    }
  }

  if (items.length === 0) {
    return filtered ? (
      <div className="empty">
        <div className="empty-title">No applications match these filters</div>
        <p className="empty-text">Set both filters to All to see everything the agent has reported.</p>
      </div>
    ) : (
      <div className="empty">
        <div className="empty-title">No applications yet</div>
        <p className="empty-text">
          The apply agent has not reported anything for your account, which usually means it is not connected yet. It
          runs on your computer and needs an agent key from the setup section below.
        </p>
        <button type="button" className="btn btn-secondary" onClick={showAgentSetup}>
          Set up the agent
        </button>
      </div>
    )
  }

  return (
    <div className="stack-3">
      <div className="card table-card">
        {/* Focusable so keyboard users can scroll the table sideways on narrow screens. */}
        <div className="table-scroll" role="region" aria-labelledby="applications-heading" tabIndex={0}>
          <table className="table">
            <caption className="sr-only">
              Applications reported by the agent, newest first. Showing {items.length} of {total}.
            </caption>
            <thead>
              <tr>
                <th scope="col">Role</th>
                <th scope="col">Platform</th>
                <th scope="col">Status</th>
                <th scope="col">Detail</th>
                <th scope="col">When</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => {
                const label = STATUS_LABELS[a.status] ?? { text: a.status, tone: 'neutral' }
                return (
                  <tr key={a.id}>
                    <td className="table-role">
                      <a href={a.jobUrl} target="_blank" rel="noopener noreferrer">
                        {a.title}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                      <div className="muted-small">{[a.company, a.location].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td>{a.platform}</td>
                    <td>
                      <Badge tone={label.tone}>{label.text}</Badge>
                    </td>
                    <td className="muted-small">{a.detail ?? '—'}</td>
                    <td className="table-when op-numeric">
                      <time dateTime={a.occurredAt}>{formatWhen(a.occurredAt)}</time>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {moreError && <ErrorNotice error={moreError} onRetry={() => void loadMore()} />}
      <div className="row wrap">
        <p className="muted-small" aria-live="polite">
          Showing {items.length} of {total}
        </p>
        <div className="grow" />
        {items.length < total && (
          <button type="button" className="btn btn-secondary btn-sm" disabled={loadingMore} onClick={() => void loadMore()}>
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>
    </div>
  )
}
