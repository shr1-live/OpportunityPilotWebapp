import { SchedulePanel } from './SchedulePanel'
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ErrorNotice } from '../../components/ErrorNotice'
import { Badge } from '../../components/StatusBadge'
import { api } from '../../lib/api'
import type { Campaign, ProfileSummary, ResearchJob, Source } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { formatWhen } from '../applications/applicationStatus'
import { JOB_STATE_LABELS } from '../research/researchModel'
import {
  applicableCriteria,
  type CampaignDraft,
  criteriaSummary,
  MODE_LABELS,
  normaliseWeights,
  SOURCE_KIND_LABELS,
  type SupportedMode,
  WEIGHT_DEFS,
  weightsForMode,
} from './campaignModel'

interface Props {
  campaign: Campaign
  draft: CampaignDraft
  mode: SupportedMode
  profile: ProfileSummary | undefined
  profileLoading?: boolean
  dirty: boolean
  onEdit: (step: number) => void
}

export function ReviewStep({ campaign, draft, mode, profile, profileLoading, dirty, onEdit }: Props) {
  const navigate = useNavigate()
  const sources = useApi<Source[]>(`/api/v1/campaigns/${campaign.id}/sources`)
  const jobs = useApi<ResearchJob[]>(`/api/v1/campaigns/${campaign.id}/research-jobs`)
  const [queueing, setQueueing] = useState(false)
  const [queueError, setQueueError] = useState<Error>()
  // A ref, not state: two clicks in the same frame both see the state before React re-renders.
  const inFlight = useRef(false)

  const lines = criteriaSummary(mode, draft.criteria)
  const weights = weightsForMode(mode, draft.weights)
  const shares = normaliseWeights(weights, applicableCriteria(mode, draft.criteria))
  const sourceList = sources.data ?? []
  const failed = sourceList.filter((s) => s.status === 'Failed')
  const activeJob = jobs.data?.find((j) => j.state === 'Queued' || j.state === 'Running')

  let blocked: string | null = null
  if (dirty) blocked = 'Save your changes first — a run uses the saved campaign.'
  else if (sources.data && sourceList.length === 0) blocked = 'Add a source in step 3 first; a run with no sources finds nothing.'

  async function queue() {
    if (inFlight.current || blocked) return
    inFlight.current = true
    setQueueing(true)
    setQueueError(undefined)
    try {
      const { jobId } = await api<{ jobId: string }>(`/api/v1/campaigns/${campaign.id}/research`, { method: 'POST' })
      navigate(`/research/${jobId}`)
    } catch (e) {
      setQueueError(e as Error)
      inFlight.current = false
      setQueueing(false)
    }
  }

  return (
    <div className="stack-6">
      <dl className="review-list">
        <div>
          <dt>Profile</dt>
          <dd>{profile ? `${profile.name} (${profile.type})` : <span className="muted-small">{profileLoading ? 'Loading…' : 'Profile not found'}</span>}</dd>
          <dd className="review-edit muted-small">Fixed</dd>
        </div>
        <div>
          <dt>Mode</dt>
          <dd>{MODE_LABELS[campaign.mode]}</dd>
          <dd className="review-edit muted-small">Fixed</dd>
        </div>
        <div>
          <dt>Goal</dt>
          <dd>{draft.goal.trim() || <span className="muted-small">No goal written</span>}</dd>
          <dd className="review-edit">
            <button type="button" className="btn-link small" onClick={() => onEdit(1)}>
              Edit<span className="sr-only"> goal</span>
            </button>
          </dd>
        </div>
        <div>
          <dt>Criteria</dt>
          <dd>
            {lines.length ? (
              <ul className="plain-list stack-1">
                {lines.map((l) => (
                  <li key={l.label}>
                    <span className="muted-small">{l.label}:</span> {l.value}{' '}
                    {l.kind === 'hard' && <Badge tone="warning">Hard filter</Badge>}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-warning">No criteria entered — nothing would be filtered out and fit scores would mean little.</span>
            )}
          </dd>
          <dd className="review-edit">
            <button type="button" className="btn-link small" onClick={() => onEdit(2)}>
              Edit<span className="sr-only"> criteria</span>
            </button>
          </dd>
        </div>
        <div>
          <dt>Result limit</dt>
          <dd className="op-numeric">{draft.resultLimit} new opportunities per run</dd>
          <dd className="review-edit">
            <button type="button" className="btn-link small" onClick={() => onEdit(2)}>
              Edit<span className="sr-only"> result limit</span>
            </button>
          </dd>
        </div>
        {mode === 'Job' && (
          <div>
            <dt>Suggest for approval</dt>
            <dd className="op-numeric">
              {draft.autoSuggestMinScore === null
                ? 'Off — new matches stay in Opportunities'
                : `Qualified jobs scoring at least ${draft.autoSuggestMinScore} wait in Approvals`}
            </dd>
            <dd className="review-edit">
              <button type="button" className="btn-link small" onClick={() => onEdit(2)}>
                Edit<span className="sr-only"> approval suggestions</span>
              </button>
            </dd>
          </div>
        )}
        <div>
          <dt>Scoring weights</dt>
          <dd>
            <ul className="plain-list stack-1 op-numeric">
              {WEIGHT_DEFS[mode].map((d) => (
                <li key={d.key}>
                  {d.label}: {shares[d.key] === null ? <span className="muted-small">not applied</span> : `${shares[d.key]} of 100`}
                </li>
              ))}
            </ul>
          </dd>
          <dd className="review-edit">
            <button type="button" className="btn-link small" onClick={() => onEdit(2)}>
              Edit<span className="sr-only"> weights</span>
            </button>
          </dd>
        </div>
        <div>
          <dt>Sources</dt>
          <dd>
            {sources.error && <ErrorNotice error={sources.error} onRetry={sources.reload} />}
            {sources.loading && !sources.data && <span className="muted-small">Loading sources…</span>}
            {sources.data &&
              (sourceList.length ? (
                <ul className="plain-list stack-1">
                  {sourceList.map((s) => (
                    <li key={s.id}>
                      {s.label} <span className="muted-small">· {SOURCE_KIND_LABELS[s.kind] ?? s.kind}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-warning">None yet</span>
              ))}
          </dd>
          <dd className="review-edit">
            <button type="button" className="btn-link small" onClick={() => onEdit(3)}>
              Edit<span className="sr-only"> sources</span>
            </button>
          </dd>
        </div>
      </dl>

      <section className="stack-2" aria-labelledby="review-coverage">
        <h4 id="review-coverage" className="section-heading">
          Source coverage
        </h4>
        <ul className="plain-list stack-1 small">
          <li>
            {sourceList.length} {sourceList.length === 1 ? 'source' : 'sources'} you added
            {failed.length > 0 && <span className="text-warning"> · {failed.length} failed last time — a run will be marked completed with gaps if it fails again</span>}
          </li>
          <li className="muted-small">Discovery provider: not built yet, so only your own sources (and local-agent postings) are read.</li>
          <li className="muted-small">
            Workload and duration are not estimated here — the server does not report them before a run. The run reads at
            most 100 candidates and keeps up to {campaign.resultLimit} new ones.
          </li>
        </ul>
      </section>

      <div className="run-grid">
        <section className="card stack-3" aria-labelledby="run-manual">
          <div className="row wrap">
            <h4 id="run-manual" className="section-heading">
              Manual run
            </h4>
          </div>
          <p className="muted-small">
            Queues one job now. You can leave the page; the job keeps running on the server.
          </p>
          {activeJob && (
            <p className="notice notice-neutral">
              A run is already {activeJob.state === 'Queued' ? 'queued' : 'running'}.{' '}
              <Link to={`/research/${activeJob.id}`}>Follow its progress</Link>
            </p>
          )}
          {queueError && <ErrorNotice error={queueError} />}
          <div>
            <button type="button" className="btn btn-primary" disabled={queueing || blocked !== null} onClick={() => void queue()}>
              {queueing ? 'Queueing…' : 'Queue research run'}
            </button>
          </div>
          <p className="hint">
            {blocked ?? 'Queued once per click. If a run for this campaign is already queued or running, you are taken to it instead of a duplicate.'}
          </p>
        </section>

        <section className="card stack-3" aria-labelledby="run-scheduled">
          <div className="row wrap">
            <h4 id="run-scheduled" className="section-heading">
              Scheduled run
            </h4>
            <Badge tone="warning">Schedule setup required</Badge>
          </div>
          <p className="muted-small">
            Scheduling needs a verified worker trigger, which this build does not have. Runs start only when you queue
            them; nothing here runs on its own.
          </p>
        </section>
      </div>

      <section className="stack-2" aria-labelledby="review-history">
        <h4 id="review-history" className="section-heading">
          Previous runs
        </h4>
        {jobs.error && <ErrorNotice error={jobs.error} onRetry={jobs.reload} />}
        {jobs.loading && !jobs.data && <p className="muted-small">Loading runs…</p>}
        {jobs.data?.length === 0 && <p className="muted-small">This campaign has not been run yet.</p>}
        {jobs.data && jobs.data.length > 0 && (
          <ul className="plain-list cap-mini">
            {jobs.data.slice(0, 5).map((j) => (
              <li key={j.id} className="row wrap">
                <Badge tone={JOB_STATE_LABELS[j.state]?.tone}>{JOB_STATE_LABELS[j.state]?.text ?? j.state}</Badge>
                <Link to={`/research/${j.id}`}>
                  Queued <time dateTime={j.createdAt}>{formatWhen(j.createdAt)}</time>
                </Link>
                <span className="muted-small op-numeric">
                  {j.counts.qualified} qualified · {j.counts.needsVerification} to verify · {j.counts.excluded} excluded
                </span>
              </li>
            ))}
          </ul>
        )}
        {campaign.opportunityCount > 0 && (
          <Link className="btn btn-secondary btn-sm" to={`/campaigns/${campaign.id}/opportunities`}>
            View {campaign.opportunityCount} opportunities
          </Link>
        )}
      </section>

      <SchedulePanel campaignId={campaign.id} />

      <p className="hint">Results are a research shortlist ranked by fit, not confirmed interest.</p>
    </div>
  )
}
