import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ErrorNotice } from '../../components/ErrorNotice'
import { Badge } from '../../components/StatusBadge'
import { PageHeader } from '../../components/PageHeader'
import { api } from '../../lib/api'
import type { ApprovalItem, ApprovalPage, CampaignSummary, DecideRequest, DecideResult } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { appliesViaLabel, formatCoverage, formatScore, platformLabel } from '../opportunities/opportunityModel'
import { useShell } from '../shell/ShellContext'
import {
  addResults,
  appendUniqueItems,
  approvalsPath,
  decideBatches,
  decidePayload,
  EMPTY_RESULT,
  groupByCampaign,
  pruneSelection,
  resultSummary,
  selectAll,
  selectAllState,
  selectNone,
  toggleSelected,
} from './approvalModel'

interface Outcome {
  result: DecideResult
  error?: Error
}

/** /approvals — research's suggestions (status Suggested), approved or rejected in one batch. */
export function ApprovalQueuePage() {
  const [params, setParams] = useSearchParams()
  const campaignId = params.get('campaign') ?? ''
  const campaigns = useApi<CampaignSummary[]>('/api/v1/campaigns')
  const jobCampaigns = (campaigns.data ?? []).filter((c) => c.mode === 'Job')
  const campaign = jobCampaigns.find((c) => c.id === campaignId)
  const { refreshOverview } = useShell()
  const [outcome, setOutcome] = useState<Outcome>()
  const [reloads, setReloads] = useState(0)

  const choose = (id: string) => {
    setOutcome(undefined)
    setParams(id ? { campaign: id } : {}, { replace: true })
  }

  const decided = (o: Outcome) => {
    setOutcome(o)
    setReloads((n) => n + 1)
    refreshOverview()
  }

  return (
    <div className="page stack-6">
      <PageHeader
        title="Approvals"
        subtitle={
          <>
            Jobs research suggested because they qualified and scored at or above your campaign&rsquo;s threshold.
            <strong> Approve</strong> moves a job to Shortlisted: your agent applies to shortlisted LinkedIn and Naukri jobs
            on its next apply run, and you apply to the others from their application page. Nothing is applied when you
            approve. <strong>Reject</strong> dismisses it; you can restore it from Opportunities.
          </>
        }
      />

      {campaigns.error && <ErrorNotice error={campaigns.error} onRetry={campaigns.reload} />}

      <div className="filters">
        <div className="field field-wide">
          <label htmlFor="approvals-campaign">Campaign</label>
          <select id="approvals-campaign" value={campaignId} onChange={(e) => choose(e.target.value)}>
            <option value="">All campaigns</option>
            {campaignId && campaigns.data && !campaign && <option value={campaignId}>Unknown campaign</option>}
            {jobCampaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div role="status" aria-live="polite" className="stack-2">
        {outcome && (
          <p className={`notice ${outcome.error ? 'notice-warning' : 'notice-neutral'}`}>
            <span>
              {resultSummary(outcome.result)}.
              {outcome.result.skipped > 0 &&
                ' Skipped jobs were no longer awaiting approval (decided elsewhere) or are not in your account.'}
              {outcome.error && ' The request did not finish — the list below shows what the server has now.'}
            </span>
          </p>
        )}
      </div>
      {outcome?.error && <ErrorNotice error={outcome.error} />}

      <Queue
        key={`${campaignId}|${reloads}`}
        campaignId={campaignId || null}
        campaign={campaign}
        jobCampaigns={campaigns.data ? jobCampaigns : undefined}
        onDecided={decided}
      />
    </div>
  )
}

function Queue({
  campaignId,
  campaign,
  jobCampaigns,
  onDecided,
}: {
  campaignId: string | null
  campaign: CampaignSummary | undefined
  jobCampaigns: CampaignSummary[] | undefined
  onDecided: (o: Outcome) => void
}) {
  const first = useApi<ApprovalPage>(approvalsPath(campaignId, 0))
  const [more, setMore] = useState<ApprovalItem[]>([])
  const [fetchedMore, setFetchedMore] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState<Error>()
  const [selected, setSelected] = useState<Set<string>>(selectNone)
  const [busy, setBusy] = useState(false)
  const allRef = useRef<HTMLInputElement>(null)

  const items = first.data ? appendUniqueItems(first.data.items, more) : []
  const visibleSelection = pruneSelection(selected, items)
  const allState = selectAllState(items, visibleSelection)

  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = allState === 'some'
  }, [allState])

  if (first.error && !first.data) return <ErrorNotice error={first.error} onRetry={first.reload} />
  if (!first.data) return <p className="muted-small">Loading suggestions…</p>

  const total = first.data.total
  const count = visibleSelection.size

  async function loadMore() {
    setLoadingMore(true)
    setMoreError(undefined)
    try {
      const page = await api<ApprovalPage>(approvalsPath(campaignId, (first.data?.items.length ?? 0) + fetchedMore))
      setMore((m) => appendUniqueItems(m, page.items))
      setFetchedMore((n) => n + page.items.length)
    } catch (e) {
      setMoreError(e as Error)
    } finally {
      setLoadingMore(false)
    }
  }

  async function decide(payload: DecideRequest) {
    if (busy) return
    setBusy(true)
    let result = EMPTY_RESULT
    let error: Error | undefined
    // The API takes at most 200 ids per request; larger batches are sent in turn and the counts added up.
    for (const batch of decideBatches(payload)) {
      try {
        result = addResults(
          result,
          await api<DecideResult>('/api/v1/approvals/decide', { method: 'POST', body: JSON.stringify(batch) }),
        )
      } catch (e) {
        error = e as Error
        break
      }
    }
    setBusy(false)
    onDecided({ result, error })
  }

  function approveAll() {
    const agent = items.filter((i) => i.appliesVia === 'Agent').length
    const notLoaded = total - items.length
    const message =
      `Approve all ${items.length} suggested ${items.length === 1 ? 'job' : 'jobs'}${notLoaded > 0 ? ` shown here (${notLoaded} more are not loaded and stay waiting)` : ''}?\n\n` +
      `They move to Shortlisted. Your agent applies to ${agent} (LinkedIn/Naukri) on its next apply run; ` +
      `you apply to the other ${items.length - agent} from their application pages. Nothing is applied right now.`
    if (!window.confirm(message)) return
    void decide(decidePayload(items.map((i) => i.opportunityId), []))
  }

  if (items.length === 0) return <EmptyQueue campaignId={campaignId} campaign={campaign} jobCampaigns={jobCampaigns} />

  return (
    <section className="stack-4" aria-labelledby="approvals-heading">
      <h3 id="approvals-heading" className="sr-only">
        Suggested jobs
      </h3>
      <div className="card bulk-bar">
        <label className="check bulk-check">
          <input
            ref={allRef}
            type="checkbox"
            checked={allState === 'all'}
            disabled={busy}
            onChange={(e) => setSelected(e.target.checked ? selectAll(items) : selectNone())}
          />
          Select all {items.length} shown
        </label>
        <span className="muted-small op-numeric">
          {count} selected · {total} awaiting
        </span>
        <div className="grow" />
        <div className="row wrap bulk-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busy || count === 0}
            aria-describedby={count === 0 ? 'bulk-why' : undefined}
            onClick={() => void decide(decidePayload(visibleSelection, []))}
          >
            {busy ? 'Working…' : 'Approve selected'}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={busy || count === 0}
            aria-describedby={count === 0 ? 'bulk-why' : undefined}
            onClick={() => void decide(decidePayload([], visibleSelection))}
          >
            Reject selected
          </button>
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={approveAll}>
            Approve all {items.length}
          </button>
        </div>
        {count === 0 && (
          <p id="bulk-why" className="hint bulk-hint">
            Select at least one job to approve or reject it. &ldquo;Approve all&rdquo; asks you to confirm first.
          </p>
        )}
      </div>

      {groupByCampaign(items).map((g) => (
        <section key={g.campaignId} className="stack-2" aria-labelledby={`group-${g.campaignId}`}>
          <div className="row wrap">
            <h4 id={`group-${g.campaignId}`} className="section-heading">
              {g.campaignName}
            </h4>
            <span className="muted-small op-numeric">
              {g.items.length} {g.items.length === 1 ? 'job' : 'jobs'}
            </span>
            <div className="grow" />
            <Link to={`/campaigns/${g.campaignId}/edit?step=2`} className="small">
              Suggestion settings<span className="sr-only"> for {g.campaignName}</span>
            </Link>
          </div>
          <ul className="plain-list approval-list">
            {g.items.map((item) => (
              <ApprovalRow
                key={item.opportunityId}
                item={item}
                checked={visibleSelection.has(item.opportunityId)}
                disabled={busy}
                onToggle={(on) => setSelected((s) => toggleSelected(s, item.opportunityId, on))}
              />
            ))}
          </ul>
        </section>
      ))}

      {moreError && <ErrorNotice error={moreError} onRetry={() => void loadMore()} />}
      <div className="row wrap">
        <p className="muted-small">
          Showing {items.length} of {total} · highest fit score first
        </p>
        <div className="grow" />
        {items.length < total && (
          <button type="button" className="btn btn-secondary btn-sm" disabled={loadingMore || busy} onClick={() => void loadMore()}>
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>
    </section>
  )
}

function ApprovalRow({
  item,
  checked,
  disabled,
  onToggle,
}: {
  item: ApprovalItem
  checked: boolean
  disabled: boolean
  onToggle: (on: boolean) => void
}) {
  const platform = platformLabel(item.platform)
  return (
    <li className={`card approval-item ${checked ? 'approval-item-selected' : ''}`}>
      <label className="approval-check">
        <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onToggle(e.target.checked)} />
        <span className="sr-only">Select {item.title}</span>
      </label>
      <div className="approval-body stack-1">
        <div className="row wrap approval-head">
          <Link to={`/opportunities/${item.opportunityId}`} className="approval-title">
            {item.title}
          </Link>
          <div className="grow" />
          <span className="op-numeric nowrap">
            <strong>Fit {formatScore(item.score)}</strong> <span className="muted-small">· {formatCoverage(item.coverage)}</span>
          </span>
        </div>
        <div className="muted-small break">
          {[item.organization, item.location].filter(Boolean).join(' · ') || 'Organisation not stated'}
        </div>
        <div className="row wrap">
          {platform && <Badge>{platform}</Badge>}
          <span className="small">
            Applies via: <strong>{appliesViaLabel(item.appliesVia, item.platform)}</strong>
          </span>
        </div>
        {item.outcomeReason && <p className="muted-small break">{item.outcomeReason}</p>}
      </div>
    </li>
  )
}

function EmptyQueue({
  campaignId,
  campaign,
  jobCampaigns,
}: {
  campaignId: string | null
  campaign: CampaignSummary | undefined
  jobCampaigns: CampaignSummary[] | undefined
}) {
  if (campaignId) {
    const threshold = campaign?.autoSuggestMinScore
    return (
      <div className="empty">
        <div className="empty-title">Nothing from this campaign is waiting for approval</div>
        <p className="empty-text">
          {threshold === null
            ? 'Suggestions are off for this campaign. Turn on “Suggest jobs for approval” in its Filters step; after the next research run, qualified jobs at or above your threshold wait here.'
            : typeof threshold === 'number'
              ? `This campaign suggests qualified jobs scoring at least ${threshold}. None are waiting — queue a research run, or lower the threshold in its Filters step.`
              : 'Suggestions appear after a research run when “Suggest jobs for approval” is on in the campaign’s Filters step.'}
        </p>
        <Link className="btn btn-secondary" to={`/campaigns/${campaignId}/edit?step=2`}>
          Open its Filters step
        </Link>
      </div>
    )
  }
  const withSuggestions = jobCampaigns?.filter((c) => typeof c.autoSuggestMinScore === 'number').length
  return (
    <div className="empty">
      <div className="empty-title">Nothing is waiting for approval</div>
      <p className="empty-text">
        Suggestions appear here after a research run, when a Job campaign has &ldquo;Suggest jobs for approval&rdquo;
        turned on in its Filters step: qualified jobs scoring at least the threshold you set wait here, and nothing is
        applied until you approve.
        {withSuggestions === 0 && ' None of your Job campaigns has it turned on yet.'}
      </p>
      <Link className="btn btn-secondary" to="/campaigns">
        Open campaigns
      </Link>
    </div>
  )
}
