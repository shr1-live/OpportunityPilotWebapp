import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ErrorNotice } from '../../components/ErrorNotice'
import { Badge } from '../../components/StatusBadge'
import { api, apiDownload } from '../../lib/api'
import { exportFilename, saveBlob } from '../../lib/download'
import type {
  CampaignSummary,
  FilterOutcome,
  OpportunityDetail,
  OpportunityPage,
  OpportunityStatus,
  OpportunitySummary,
} from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { formatWhen } from '../applications/applicationStatus'
import { MODE_LABELS } from '../campaigns/campaignModel'
import { useShell } from '../shell/ShellContext'
import {
  appendUnique,
  DEFAULT_FILTERS,
  formatCoverage,
  formatScore,
  opportunitiesPath,
  type OpportunityFilters,
  OUTCOME_LABELS,
  platformLabel,
  quickActions,
  STATUS_LABELS,
  STATUSES,
} from './opportunityModel'

/**
 * /opportunities (campaign chosen with ?campaign=, defaulting to the newest) and /campaigns/:id/opportunities.
 * Opportunities belong to a campaign in the API, so the list is always one campaign's.
 */
export function OpportunitiesPage() {
  const { id: routeId } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const campaigns = useApi<CampaignSummary[]>('/api/v1/campaigns')
  const list = campaigns.data ?? []
  const campaignId = routeId ?? params.get('campaign') ?? list[0]?.id
  const campaign = list.find((c) => c.id === campaignId)

  const choose = (id: string) =>
    routeId ? navigate(`/campaigns/${id}/opportunities`) : setParams({ campaign: id }, { replace: true })

  return (
    <div className="page stack-6">
      <div className="page-head wrap">
        <div className="grow">
          <h2 className="page-title">Opportunities</h2>
          <p className="page-sub">
            Ranked by fit against your criteria. A fit score ranks a shortlist; it does not predict that anyone will hire
            you, buy or reply.
          </p>
        </div>
        <Link className="btn btn-secondary" to="/campaigns/new">
          New campaign
        </Link>
      </div>

      {campaigns.error && <ErrorNotice error={campaigns.error} onRetry={campaigns.reload} />}
      {campaigns.loading && !campaigns.data && <p className="muted-small">Loading campaigns…</p>}

      {campaigns.data && list.length === 0 && (
        <div className="empty">
          <div className="empty-title">No opportunities yet</div>
          <p className="empty-text">
            Opportunities come from research runs, and a run belongs to a campaign. Build a campaign, add sources and queue
            a run — matches appear here as they are scored.
          </p>
          <Link className="btn btn-primary" to="/campaigns/new">
            New campaign
          </Link>
        </div>
      )}

      {campaigns.data && list.length > 0 && (
        <>
          <div className="filters">
            <div className="field field-wide">
              <label htmlFor="opp-campaign">Campaign</label>
              <select id="opp-campaign" value={campaignId ?? ''} onChange={(e) => choose(e.target.value)}>
                {!campaign && campaignId && <option value={campaignId}>Unknown campaign</option>}
                {list.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {MODE_LABELS[c.mode] ?? c.mode}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {campaignId && <CampaignOpportunities key={campaignId} campaignId={campaignId} campaign={campaign} />}
        </>
      )}
    </div>
  )
}

function CampaignOpportunities({ campaignId, campaign }: { campaignId: string; campaign: CampaignSummary | undefined }) {
  const [filters, setFilters] = useState<OpportunityFilters>(DEFAULT_FILTERS)
  const [refreshes, setRefreshes] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<Error>()

  async function exportCsv() {
    setExporting(true)
    setExportError(undefined)
    try {
      const { blob, disposition } = await apiDownload(`/api/v1/campaigns/${encodeURIComponent(campaignId)}/export`, 'text/csv')
      saveBlob(blob, exportFilename(campaign?.name ?? 'campaign', disposition))
    } catch (e) {
      setExportError(e as Error)
    } finally {
      setExporting(false)
    }
  }

  return (
    <section className="stack-3" aria-labelledby="opp-heading">
      <div className="row wrap">
        <h3 id="opp-heading" className="section-heading">
          {campaign ? campaign.name : 'Campaign'}
        </h3>
        {campaign?.lastJob && (
          <Link to={`/research/${campaign.lastJob.id}`} className="small">
            Latest run
          </Link>
        )}
        <div className="grow" />
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRefreshes((n) => n + 1)}>
          Refresh
        </button>
        <button type="button" className="btn btn-secondary btn-sm" disabled={exporting} onClick={() => void exportCsv()}>
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>
      {exportError && <ErrorNotice error={exportError} />}

      <div className="filters">
        <div className="field">
          <label htmlFor="opp-outcome">Outcome</label>
          <select
            id="opp-outcome"
            value={filters.outcome}
            onChange={(e) => setFilters((f) => ({ ...f, outcome: e.target.value as FilterOutcome | '' }))}
          >
            <option value="">All</option>
            {(Object.keys(OUTCOME_LABELS) as FilterOutcome[]).map((o) => (
              <option key={o} value={o}>
                {OUTCOME_LABELS[o].text}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="opp-status">Status</label>
          <select
            id="opp-status"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as OpportunityStatus | '' }))}
          >
            <option value="">Any</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s].text}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="opp-sort">Sort by</label>
          <select
            id="opp-sort"
            value={filters.sort}
            onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as OpportunityFilters['sort'] }))}
          >
            <option value="score">Fit score</option>
            <option value="recent">Recently updated</option>
          </select>
        </div>
      </div>

      {/* Keyed so a filter change or refresh starts again from the first page. */}
      <OpportunityTable
        key={`${filters.outcome}|${filters.status}|${filters.sort}|${refreshes}`}
        campaignId={campaignId}
        filters={filters}
      />
      <p className="hint">Bulk sending is not offered: every message is approved individually once outreach arrives.</p>
    </section>
  )
}

function OpportunityTable({ campaignId, filters }: { campaignId: string; filters: OpportunityFilters }) {
  const first = useApi<OpportunityPage>(opportunitiesPath(campaignId, filters, 0))
  const [more, setMore] = useState<OpportunitySummary[]>([])
  const [fetchedMore, setFetchedMore] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState<Error>()
  // Rows changed from this table, so an update shows without refetching every page.
  const [patched, setPatched] = useState<Record<string, OpportunitySummary>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState<Error>()
  const [announcement, setAnnouncement] = useState('')
  const { refreshOverview } = useShell()

  if (first.error && !first.data) return <ErrorNotice error={first.error} onRetry={first.reload} />
  if (!first.data) return <p className="muted-small">Loading opportunities…</p>

  const items = appendUnique(first.data.items, more).map((o) => patched[o.id] ?? o)
  const total = first.data.total
  const firstCount = first.data.items.length
  const filtered = Boolean(filters.outcome || filters.status)

  async function loadMore() {
    setLoadingMore(true)
    setMoreError(undefined)
    try {
      const page = await api<OpportunityPage>(opportunitiesPath(campaignId, filters, firstCount + fetchedMore))
      setMore((m) => appendUnique(m, page.items))
      setFetchedMore((n) => n + page.items.length)
    } catch (e) {
      setMoreError(e as Error)
    } finally {
      setLoadingMore(false)
    }
  }

  async function setStatus(o: OpportunitySummary, status: OpportunityStatus) {
    setBusy(o.id)
    setActionError(undefined)
    try {
      const updated = await api<OpportunityDetail>(`/api/v1/opportunities/${o.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      setPatched((p) => ({ ...p, [o.id]: { ...o, status: updated.status, updatedAt: updated.updatedAt } }))
      // The nav's approval count changes when a suggestion is approved or rejected here.
      if (o.status === 'Suggested' || updated.status === 'Suggested') refreshOverview()
      setAnnouncement(`${o.title} is now ${STATUS_LABELS[updated.status]?.text ?? updated.status}.`)
    } catch (e) {
      setActionError(e as Error)
    } finally {
      setBusy(null)
    }
  }

  if (items.length === 0) {
    return filtered ? (
      <div className="empty">
        <div className="empty-title">Nothing matches these filters</div>
        <p className="empty-text">Set Outcome and Status to All to see every opportunity in this campaign.</p>
      </div>
    ) : (
      <div className="empty">
        <div className="empty-title">No opportunities in this campaign yet</div>
        <p className="empty-text">
          They are written by research runs. Check the campaign has sources, then queue a run from its review step.
        </p>
        <Link className="btn btn-secondary" to={`/campaigns/${campaignId}/edit?step=4`}>
          Review and run
        </Link>
      </div>
    )
  }

  return (
    <div className="stack-3">
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
      {actionError && <ErrorNotice error={actionError} />}
      <div className="card table-card">
        <div className="table-scroll" role="region" aria-labelledby="opp-heading" tabIndex={0}>
          <table className="table">
            <caption className="sr-only">
              Opportunities sorted by {filters.sort === 'score' ? 'fit score' : 'most recently updated'}. Showing {items.length} of {total}.
            </caption>
            <thead>
              <tr>
                <th scope="col">Opportunity</th>
                <th scope="col">Mode</th>
                <th scope="col" aria-sort={filters.sort === 'score' ? 'descending' : undefined}>
                  Fit score
                </th>
                <th scope="col">Outcome</th>
                <th scope="col">Status</th>
                <th scope="col" aria-sort={filters.sort === 'recent' ? 'descending' : undefined}>
                  Updated
                </th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => {
                const outcome = OUTCOME_LABELS[o.outcome] ?? { text: o.outcome, tone: 'neutral' }
                const status = STATUS_LABELS[o.status] ?? { text: o.status, tone: 'neutral' }
                return (
                  <tr key={o.id}>
                    <td className="table-role">
                      <Link to={`/opportunities/${o.id}`}>{o.title}</Link>
                      <div className="muted-small">{[o.organization, o.location].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td>
                      {MODE_LABELS[o.mode] ?? o.mode}
                      {platformLabel(o.platform) && <div className="muted-small">{platformLabel(o.platform)}</div>}
                    </td>
                    <td className="op-numeric nowrap">
                      <strong>Fit {formatScore(o.score)}</strong>
                      <div className="muted-small">{formatCoverage(o.coverage)}</div>
                    </td>
                    <td>
                      <Badge tone={outcome.tone}>{outcome.text}</Badge>
                      {o.outcomeReason && <div className="muted-small clamp-2">{o.outcomeReason}</div>}
                      {o.gapsCount > 0 && <div className="muted-small">{o.gapsCount} not verified</div>}
                    </td>
                    <td>
                      <Badge tone={status.tone}>{status.text}</Badge>
                    </td>
                    <td className="table-when op-numeric">
                      <time dateTime={o.updatedAt}>{formatWhen(o.updatedAt)}</time>
                    </td>
                    <td>
                      <div className="row-actions">
                        {quickActions(o.status).map((a) => (
                          <button
                            key={a.to}
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={busy === o.id}
                            onClick={() => void setStatus(o, a.to)}
                          >
                            {a.label}
                            <span className="sr-only"> {o.title}</span>
                          </button>
                        ))}
                      </div>
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
          Showing {items.length} of {total} · sorted and paged by the server
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
