import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorNotice } from '../../components/ErrorNotice'
import { LoadingState } from '../../components/States'
import { Badge } from '../../components/StatusBadge'
import { PageHeader } from '../../components/PageHeader'
import { api } from '../../lib/api'
import type { Evidence, OpportunityDetail, OpportunityStatus } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { formatWhen } from '../applications/applicationStatus'
import { MODE_LABELS } from '../campaigns/campaignModel'
import { useShell } from '../shell/ShellContext'
import {
  agentApplyPlatform,
  displayUrl,
  factLabel,
  formatPoints,
  isUserApplyBoard,
  OUTCOME_LABELS,
  platformLabel,
  safeHref,
  settableStatuses,
  STATUS_LABELS,
  valueLabel,
} from './opportunityModel'

const dateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const formatDate = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : dateFmt.format(d)
}
const evidenceAnchor = (id: string) => `evidence-${id}`

export function OpportunityDetailPage() {
  const { id = '' } = useParams()
  const loaded = useApi<OpportunityDetail>(`/api/v1/opportunities/${encodeURIComponent(id)}`)
  // PATCH returns the full detail; keep it instead of refetching.
  const [updated, setUpdated] = useState<OpportunityDetail>()
  const o = updated?.id === id ? updated : loaded.data

  if (loaded.error && !o)
    return (
      <div className="page">
        <ErrorNotice
          error={loaded.error}
          onRetry={loaded.reload}
          what="this opportunity"
          secondary={
            <Link className="btn btn-secondary btn-sm" to="/opportunities">
              Back to opportunities
            </Link>
          }
        />
      </div>
    )
  if (!o) return <div className="page"><LoadingState label="Loading opportunity…" waking={loaded.waking} rows={6} stats={3} /></div>

  return <Detail o={o} onUpdated={setUpdated} />
}

function Detail({ o, onUpdated }: { o: OpportunityDetail; onUpdated: (o: OpportunityDetail) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<Error>()
  const [announcement, setAnnouncement] = useState('')
  const [chosen, setChosen] = useState<OpportunityStatus>(o.status)
  const { refreshOverview } = useShell()

  const outcome = OUTCOME_LABELS[o.outcome] ?? { text: o.outcome, tone: 'neutral' }
  const status = STATUS_LABELS[o.status] ?? { text: o.status, tone: 'neutral' }
  const postingHref = safeHref(o.url)
  const applyHref = safeHref(o.applyUrl)
  const agentPlatform = agentApplyPlatform(o)
  // Greenhouse / Lever / Adzuna: the agent never applies there, so the application page is the way in.
  const userApplies = o.mode === 'Job' && isUserApplyBoard(o.platform)
  const showApply = Boolean(applyHref) && (userApplies || applyHref !== postingHref)
  const showPosting = Boolean(postingHref) && !(userApplies && postingHref === applyHref)
  const platform = platformLabel(o.platform)
  const suggested = o.status === 'Suggested'
  const evidenceById = new Map(o.evidence.map((e) => [e.id, e]))

  async function setStatus(next: OpportunityStatus) {
    if (next === o.status) return
    if (
      next === 'Applied' &&
      !window.confirm('Mark this as applied? Only do this if you have applied yourself — it is recorded in the activity history.')
    )
      return
    setBusy(true)
    setError(undefined)
    try {
      const result = await api<OpportunityDetail>(`/api/v1/opportunities/${o.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      })
      onUpdated(result)
      setChosen(result.status)
      // The nav's approval count changes when a suggestion is approved or rejected here.
      if (o.status === 'Suggested' || result.status === 'Suggested') refreshOverview()
      setAnnouncement(`Status changed to ${STATUS_LABELS[result.status]?.text ?? result.status}.`)
    } catch (e) {
      setError(e as Error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page stack-6">
      <div className="stack-2">
        <Link to={`/campaigns/${o.campaignId}/opportunities`} className="small">
          ← Back to opportunities
        </Link>
        <PageHeader
          title={o.title}
          badges={
            <>
              <Badge>{MODE_LABELS[o.mode] ?? o.mode}</Badge>
              <Badge tone={status.tone}>{status.text}</Badge>
            </>
          }
          subtitle={[o.organization, o.location, platform].filter(Boolean).join(' · ')}
          meta={
            <>
              Updated <time dateTime={o.updatedAt}>{formatWhen(o.updatedAt)}</time>
            </>
          }
          actions={
            ((showPosting && postingHref) || (showApply && applyHref)) && (
              <>
                {showPosting && postingHref && (
                  <a className="btn btn-secondary" href={postingHref} target="_blank" rel="noopener noreferrer">
                    {o.mode === 'Job' ? 'Open posting' : 'Open website'}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                )}
                {showApply && applyHref && (
                  <a
                    className={`btn ${userApplies ? 'btn-primary' : 'btn-secondary'}`}
                    href={applyHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open application page
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                )}
              </>
            )
          }
        />
      </div>

      <section className="card stack-3" aria-labelledby="status-heading">
        <h3 id="status-heading" className="section-heading">
          Pipeline status
        </h3>
        <div className="row wrap">
          {/* Quick triage only before acting on it; later stages are changed deliberately with "Set status". */}
          {suggested && (
            <>
              <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void setStatus('Shortlisted')}>
                Approve
              </button>
              <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void setStatus('Dismissed')}>
                Reject
              </button>
            </>
          )}
          {(o.status === 'New' || o.status === 'Dismissed') && (
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void setStatus('Shortlisted')}>
              Shortlist
            </button>
          )}
          {(o.status === 'New' || o.status === 'Shortlisted') && (
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void setStatus('Dismissed')}>
              Dismiss
            </button>
          )}
          {o.status !== 'Applied' && o.mode === 'Job' && (
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void setStatus('Applied')}>
              Mark applied
            </button>
          )}
          {o.status !== 'Contacted' && o.mode !== 'Job' && (
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void setStatus('Contacted')}>
              Mark contacted
            </button>
          )}
          <div className="grow" />
          <form
            className="row wrap status-form"
            onSubmit={(e) => {
              e.preventDefault()
              void setStatus(chosen)
            }}
          >
            <label htmlFor="status-select" className="small">
              Set status
            </label>
            <select id="status-select" value={chosen} onChange={(e) => setChosen(e.target.value as OpportunityStatus)}>
              {settableStatuses(o.status).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s].text}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-secondary btn-sm" disabled={busy || chosen === o.status}>
              {busy ? 'Saving…' : 'Update'}
            </button>
          </form>
        </div>
        <span className="sr-only" role="status" aria-live="polite">
          {announcement}
        </span>
        {error && <ErrorNotice error={error} />}
        {suggested && (
          <p className="notice notice-warning">
            <span>
              Suggested for approval: research scored this at or above your campaign&rsquo;s threshold. Approve to shortlist
              it, reject to dismiss it — nothing is applied until you approve. You can also decide in bulk on the{' '}
              <Link to="/approvals">Approvals page</Link>.
            </span>
          </p>
        )}
        {agentPlatform && (
          <p className="notice notice-neutral">
            <span>
              The apply agent will apply to this on its next <code>npm run agent -- apply {agentPlatform}</code> run.
            </span>
          </p>
        )}
        {userApplies && o.status !== 'Applied' && (
          <p className="notice notice-neutral">
            <span>
              You apply to this one yourself: the agent only applies on LinkedIn and Naukri.{' '}
              {applyHref
                ? 'Open the application page, apply there, then come back and choose Mark applied.'
                : 'No usable application link was found, so look the job up on the company’s site, then choose Mark applied.'}
            </span>
          </p>
        )}
        <p className="hint">
          Status changes are yours alone. Research only moves a New job to Awaiting approval when the campaign suggests
          jobs; it never resets a status you set.
        </p>
      </section>

      <div className="detail-grid">
        <div className="stack-6">
          <section className="card stack-3" aria-labelledby="fit-heading">
            <h3 id="fit-heading" className="sr-only">
              Fit score
            </h3>
            <div className="fit">
              <div className="fit-score op-numeric">
                <span className="fit-value">{Math.round(o.score)}</span>
                <span className="fit-of">/ 100 fit</span>
              </div>
              <div className="stack-1">
                <div className="op-numeric">Evidence coverage {Math.round(o.coverage)}%</div>
                <div className="row wrap">
                  <Badge tone={outcome.tone}>{outcome.text}</Badge>
                  {o.outcomeReason && <span className="muted-small">{o.outcomeReason}</span>}
                </div>
              </div>
            </div>
            <p className="muted-small">
              A ranking against your criteria. It does not predict interest, budget or a reply.
            </p>
          </section>

          <section className="stack-3" aria-labelledby="contrib-heading">
            <h3 id="contrib-heading" className="section-heading">
              Fit contributions
            </h3>
            {o.breakdown.length === 0 ? (
              <p className="muted-small">No criteria were scored for this opportunity.</p>
            ) : (
              <div className="card table-card">
                <div className="table-scroll" role="region" aria-labelledby="contrib-heading" tabIndex={0}>
                  <table className="table table-compact">
                    <caption className="sr-only">
                      Points earned per criterion out of its weight. Unknown values score 0 and lower coverage.
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Criterion</th>
                        <th scope="col">Points</th>
                        <th scope="col">Value</th>
                        <th scope="col">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {o.breakdown.map((b) => {
                        const v = valueLabel(b.value)
                        return (
                          <tr key={b.criterion}>
                            <th scope="row" className="table-rowhead">
                              {b.label}
                            </th>
                            <td className="op-numeric nowrap">{formatPoints(b.points, b.weight)}</td>
                            <td>
                              <Badge tone={v.tone}>{v.text}</Badge>
                            </td>
                            <td>
                              {b.reason}
                              {b.excerpt && <q className="fit-excerpt">{b.excerpt}</q>}
                              <EvidenceRefs ids={b.evidenceIds} evidence={evidenceById} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          <section className="card stack-3" aria-labelledby="facts-heading">
            <div className="row wrap">
              <h3 id="facts-heading" className="section-heading">
                Facts
              </h3>
              <span className="muted-small">Extracted by rules from the evidence</span>
            </div>
            {o.facts.length === 0 && o.gaps.length === 0 && <p className="muted-small">No facts were extracted.</p>}
            <ul className="plain-list fact-list">
              {o.facts.map((f) => {
                const l = factLabel(f)
                const ev = f.evidenceId ? evidenceById.get(f.evidenceId) : undefined
                return (
                  <li key={f.key}>
                    <div className="fact-main">
                      <div className="muted-small">{f.label}</div>
                      <div className="fact-value">{f.value}</div>
                      {ev && (
                        <a className="small" href={`#${evidenceAnchor(ev.id)}`}>
                          Source: {ev.sourceLabel}
                        </a>
                      )}
                    </div>
                    <Badge tone={l.tone}>{l.text}</Badge>
                  </li>
                )
              })}
              {o.gaps.map((g) => (
                <li key={`gap-${g}`}>
                  <div className="fact-main">
                    <div className="fact-value">{g}</div>
                    <div className="muted-small">No source in this campaign supplied it</div>
                  </div>
                  <Badge>Not verified</Badge>
                </li>
              ))}
            </ul>
          </section>

          {o.description && (
            <section className="card stack-2" aria-labelledby="desc-heading">
              <h3 id="desc-heading" className="section-heading">
                Text as retrieved
              </h3>
              <details>
                <summary className="small">Show the excerpt used for matching</summary>
                <p className="excerpt">{o.description}</p>
              </details>
            </section>
          )}

          <section className="card stack-3" aria-labelledby="activity-heading">
            <h3 id="activity-heading" className="section-heading">
              Activity
            </h3>
            {o.activities.length === 0 ? (
              <p className="muted-small">No activity yet.</p>
            ) : (
              <ol className="plain-list activity-list">
                {o.activities.map((a, i) => (
                  <li key={`${a.occurredAt}-${i}`}>
                    <div>{a.detail || a.kind}</div>
                    <div className="muted-small">
                      {a.kind} · <time dateTime={a.occurredAt}>{formatWhen(a.occurredAt)}</time>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="card stack-3 evidence-panel" aria-labelledby="evidence-heading">
          <div className="row wrap">
            <h3 id="evidence-heading" className="section-heading">
              Evidence
            </h3>
            <span className="muted-small">
              {o.evidence.length} {o.evidence.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          {o.evidence.length === 0 ? (
            <p className="muted-small">No evidence was stored for this opportunity, so nothing here is verified.</p>
          ) : (
            <ol className="plain-list evidence-list">
              {o.evidence.map((e) => (
                <EvidenceItem key={e.id} e={e} />
              ))}
            </ol>
          )}
        </aside>
      </div>
    </div>
  )
}

function EvidenceItem({ e }: { e: Evidence }) {
  const href = safeHref(e.url)
  return (
    <li id={evidenceAnchor(e.id)} tabIndex={-1} className="evidence">
      <div className="evidence-source">{e.sourceLabel}</div>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="small break">
          {displayUrl(href)}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : (
        e.url && <div className="small muted-small break">{e.url}</div>
      )}
      {e.excerpt && <blockquote className="excerpt">{e.excerpt}</blockquote>}
      <div className="muted-small">
        Retrieved <time dateTime={e.retrievedAt}>{formatDate(e.retrievedAt)}</time> · {e.extractionMethod} extraction
      </div>
    </li>
  )
}

function EvidenceRefs({ ids, evidence }: { ids: string[]; evidence: Map<string, Evidence> }) {
  const found = ids.map((id) => evidence.get(id)).filter((e): e is Evidence => Boolean(e))
  if (!found.length) return null
  return (
    <div className="muted-small">
      Evidence:{' '}
      {found.map((e, i) => (
        <span key={e.id}>
          {i > 0 && ', '}
          <a href={`#${evidenceAnchor(e.id)}`}>{e.sourceLabel}</a>
        </span>
      ))}
    </div>
  )
}
