import { useState } from 'react'
import { safeHref } from '../opportunities/opportunityModel'
import { ErrorNotice } from '../../components/ErrorNotice'
import { Badge } from '../../components/StatusBadge'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState, FilteredEmpty, LoadingState } from '../../components/States'
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
    <div className="page page-wide stack-4">
      <PageHeader
        title="Applications"
        subtitle={
          <>
            Everything the apply agent did, plus the jobs you marked applied yourself. The agent runs on{' '}
            <strong>your machine, in your own logged-in browser</strong> — this page only reads what it reports back.
          </>
        }
        actions={
          <>
            <button type="button" className="btn btn-secondary btn-sm" onClick={refresh}>
              ↻ Refresh
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={showAgentSetup}>
              Agent setup
            </button>
          </>
        }
      />

      <SummaryStats summary={summary.data} loading={summary.loading} error={summary.error} onRetry={summary.reload} />

      <div className="apps-grid">
        <section className="panel" aria-labelledby="applications-heading">
          <header className="panel-head">
            <h3 id="applications-heading" className="eyebrow">
              Agent results
            </h3>
            <div className="grow" />
            <label className="pill-select">
              <span>Status</span>
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
            </label>
            <label className="pill-select">
              <span>Platform</span>
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
            </label>
          </header>
          <div className="panel-body">
            {/* Keyed by filters so a change starts again from the first page. */}
            <ApplicationsTable
              key={`${filters.status}|${filters.platform}|${refreshes}`}
              filters={filters}
              onClearFilters={() => setFilters({ status: '', platform: '' })}
            />
          </div>
        </section>
        <AgentSetup />
      </div>

      <HowItWorks />
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
  if (error && !summary) return <ErrorNotice error={error} onRetry={onRetry} what="the agent summary" />
  const pending = loading && !summary
  const v = (n: number | undefined) => (pending || n === undefined ? '—' : n)
  return (
    <div className="kpi-strip">
      <div className="kpi">
        <div className="eyebrow">Applied</div>
        <div className="kpi-value op-numeric">{v(summary?.applied)}</div>
        <div className="muted-small">{summary ? `${summary.appliedLast7Days} in the last 7 days` : 'Loading…'}</div>
      </div>
      <div className="kpi">
        <div className="eyebrow">Needs you</div>
        <div className={`kpi-value op-numeric ${summary?.needsManual ? 'text-warning' : ''}`}>{v(summary?.needsManual)}</div>
        <div className="muted-small">captcha or a question</div>
      </div>
      <div className="kpi">
        <div className="eyebrow">Dry run</div>
        <div className="kpi-value op-numeric">{v(summary?.dryRun)}</div>
        <div className="muted-small">filled, not submitted</div>
      </div>
      <div className="kpi">
        <div className="eyebrow">Failed</div>
        <div className={`kpi-value op-numeric ${summary?.failed ? 'text-danger' : ''}`}>{v(summary?.failed)}</div>
        <div className="muted-small">layout changed or no confirmation</div>
      </div>
      <div className="kpi">
        <div className="eyebrow">Skipped</div>
        <div className="kpi-value op-numeric">{v(summary?.skipped)}</div>
        <div className="muted-small">already applied</div>
      </div>
      <div className="kpi">
        <div className="eyebrow">Last activity</div>
        <div className="kpi-value kpi-small">
          {summary?.lastActivityAt ? <time dateTime={summary.lastActivityAt}>{formatWhen(summary.lastActivityAt)}</time> : summary ? 'No runs yet' : '—'}
        </div>
        <div className="muted-small">last result the agent reported</div>
      </div>
    </div>
  )
}

function ApplicationsTable({ filters, onClearFilters }: { filters: ApplicationFilters; onClearFilters: () => void }) {
  const first = useApi<ApplicationPage>(applicationsPath(filters, 0))
  const [more, setMore] = useState<ApplicationItem[]>([])
  // Rows received from the server, duplicates included: the next offset must move past all of them.
  const [fetchedMore, setFetchedMore] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState<Error>()

  if (first.error && !first.data) return <ErrorNotice error={first.error} onRetry={first.reload} />
  if (!first.data) return <LoadingState label="Loading applications…" waking={first.waking} />

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
      <FilteredEmpty title="No applications match these filters" onClear={onClearFilters}>
        {[filters.status && `Status “${STATUS_FILTERS.find((x) => x.value === filters.status)?.label ?? filters.status}”`, filters.platform && `platform “${PLATFORM_FILTERS.find((x) => x.value === filters.platform)?.label ?? filters.platform}”`].filter(Boolean).join(' and ')}{' '}
        together match none of the applications the agent has reported.
      </FilteredEmpty>
    ) : (
      <EmptyState
        title="No applications yet"
        actions={
          <button type="button" className="btn btn-primary btn-sm" onClick={showAgentSetup}>
            Set up the agent
          </button>
        }
      >
        The apply agent has not reported anything for your account, which usually means it is not connected yet. It runs
        on your computer and needs an agent key from the setup section below.
      </EmptyState>
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
                      {/* The URL comes from the agent; only http(s) links are rendered as links. */}
                      {safeHref(a.jobUrl) ? (
                        <a href={safeHref(a.jobUrl)!} target="_blank" rel="noopener noreferrer">
                          {a.title}
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      ) : (
                        <span>{a.title}</span>
                      )}
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
