import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorNotice } from '../../components/ErrorNotice'
import { Badge } from '../../components/StatusBadge'
import { api, ApiError } from '../../lib/api'
import type { Campaign, ResearchJob } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { formatWhen } from '../applications/applicationStatus'
import {
  EVENT_LEVEL_TONES,
  isActive,
  jobSignature,
  JOB_STATE_LABELS,
  nextPollDelay,
  shouldKeepPolling,
  stageDetail,
  stageProgress,
  STATE_EXPLANATIONS,
} from './researchModel'

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
const timeOf = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : timeFmt.format(d)
}
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

type PollState = 'polling' | 'finished' | 'paused' | 'stopped'

/** Polls the job while it is queued or running; stops when it finishes, after the time limit, or on unmount. */
function useResearchJob(id: string) {
  const [job, setJob] = useState<ResearchJob>()
  const [error, setError] = useState<Error>()
  const [pollState, setPollState] = useState<PollState>('polling')
  const [checkedAt, setCheckedAt] = useState<Date>()
  const [round, setRound] = useState(0)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const started = Date.now()
    let unchangedPolls = 0
    let errors = 0
    let last = ''

    const tick = async () => {
      let state: ResearchJob['state'] | undefined
      try {
        const next = await api<ResearchJob>(`/api/v1/research-jobs/${encodeURIComponent(id)}`)
        if (cancelled) return
        const signature = jobSignature(next)
        unchangedPolls = signature === last ? unchangedPolls + 1 : 0
        last = signature
        errors = 0
        state = next.state
        setJob(next)
        setError(undefined)
        setCheckedAt(new Date())
      } catch (e) {
        if (cancelled) return
        setError(e as Error)
        // Missing or not ours: retrying will not change the answer.
        if (e instanceof ApiError && (e.status === 404 || e.status === 403 || e.status === 401)) {
          setPollState('stopped')
          return
        }
        errors++
      }
      if (state !== undefined && !isActive(state)) {
        setPollState('finished')
        return
      }
      if (!shouldKeepPolling(state, Date.now() - started)) {
        setPollState('paused')
        return
      }
      timer = setTimeout(() => void tick(), nextPollDelay({ unchangedPolls, errors }))
    }
    void tick()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [id, round])

  const restart = () => {
    setPollState('polling')
    setRound((r) => r + 1)
  }
  return { job, setJob, error, pollState, checkedAt, restart }
}

export function ResearchProgressPage() {
  const { jobId = '' } = useParams()
  // Keyed so moving to another run starts with fresh polling state.
  return <ResearchProgress key={jobId} jobId={jobId} />
}

function ResearchProgress({ jobId }: { jobId: string }) {
  const { job, setJob, error, pollState, checkedAt, restart } = useResearchJob(jobId)
  const campaign = useApi<Campaign>(job ? `/api/v1/campaigns/${job.campaignId}` : null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelRequested, setCancelRequested] = useState(false)
  const [cancelError, setCancelError] = useState<Error>()

  async function cancel() {
    if (!window.confirm('Cancel this run? Opportunities found so far are kept.')) return
    setCancelling(true)
    setCancelError(undefined)
    try {
      const updated = await api<ResearchJob>(`/api/v1/research-jobs/${encodeURIComponent(jobId)}/cancel`, { method: 'POST' })
      setJob((prev) => ({ ...updated, events: updated.events ?? prev?.events }))
      setCancelRequested(true)
      restart()
    } catch (e) {
      setCancelError(e as Error)
    } finally {
      setCancelling(false)
    }
  }

  if (!job) {
    return (
      <div className="page stack-4">
        {error ? <ErrorNotice error={error} onRetry={restart} /> : <p className="muted-small" role="status">Loading research run…</p>}
      </div>
    )
  }

  const label = JOB_STATE_LABELS[job.state] ?? { text: job.state, tone: 'neutral' }
  const active = isActive(job.state)
  const stages = stageProgress(job)
  const events = job.events ?? []
  const c = job.counts
  const found = c.qualified + c.needsVerification + c.excluded
  const resultsPath = `/campaigns/${job.campaignId}/opportunities`

  return (
    <div className="page stack-6">
      <div className="page-head wrap">
        <div className="grow">
          <div className="row wrap">
            <h2 className="page-title">{campaign.data?.name ?? 'Research run'}</h2>
            <Badge tone={label.tone}>{label.text}</Badge>
          </div>
          <p className="muted-small op-numeric">
            Run <span className="mono">{job.id.slice(0, 8)}</span> · queued{' '}
            <time dateTime={job.createdAt}>{formatWhen(job.createdAt)}</time>
            {job.startedAt && (
              <>
                {' '}
                · started <time dateTime={job.startedAt}>{formatWhen(job.startedAt)}</time>
              </>
            )}
            {job.finishedAt && (
              <>
                {' '}
                · finished <time dateTime={job.finishedAt}>{formatWhen(job.finishedAt)}</time>
              </>
            )}{' '}
            · {timeZone}
          </p>
        </div>
        <div className="row wrap">
          {active && (
            <button type="button" className="btn btn-secondary" disabled={cancelling || cancelRequested} onClick={() => void cancel()}>
              {cancelling ? 'Cancelling…' : cancelRequested ? 'Cancel requested' : 'Cancel run'}
            </button>
          )}
          <Link className="btn btn-primary" to={resultsPath}>
            {active ? 'View partial results' : 'View results'}
          </Link>
        </div>
      </div>

      <div className={`notice ${job.state === 'Failed' ? 'notice-danger' : job.state === 'CompletedWithGaps' ? 'notice-warning' : 'notice-neutral'}`}>
        <span>
          {STATE_EXPLANATIONS[job.state]}
          {job.safeError && <> {job.safeError}</>}
          {cancelRequested && active && ' Cancel requested — the worker stops between items.'}
        </span>
      </div>
      {cancelError && <ErrorNotice error={cancelError} />}

      <p className="muted-small">
        {/* Only state and stage changes are announced; the check time would be read out every poll. */}
        <span role="status" aria-live="polite">
          {pollState === 'polling' &&
            `${label.text} · ${stages.find((s) => s.status === 'current')?.label ?? 'waiting to start'}. Checking automatically.`}
          {pollState === 'finished' && `${label.text}.`}
          {pollState === 'paused' && 'Stopped checking automatically after 10 minutes.'}
          {pollState === 'stopped' && 'Stopped checking.'}
        </span>
        {checkedAt && <> Last checked {timeFmt.format(checkedAt)}.</>}
      </p>
      {pollState === 'paused' && (
        <div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={restart}>
            Check again
          </button>
        </div>
      )}
      {error && pollState === 'polling' && (
        <p className="notice notice-warning">
          The last status check failed ({error.message}). Retrying with a longer delay.
        </p>
      )}

      <section className="card stack-3" aria-labelledby="stages-heading">
        <h3 id="stages-heading" className="section-heading">
          Stages
        </h3>
        <ol className="plain-list stages">
          {stages.map((s) => (
            <li key={s.stage} className={`stage stage-${s.status}`} aria-current={s.status === 'current' ? 'step' : undefined}>
              <span className="stage-marker" aria-hidden="true">
                {s.status === 'done' ? '✓' : s.status === 'stopped' ? '!' : ''}
              </span>
              <span className="stage-text">
                <span className="stage-label">{s.label}</span>
                <span className="sr-only">
                  {' '}
                  — {{ done: 'done', current: 'in progress', pending: 'not started', stopped: 'stopped here' }[s.status]}
                </span>
                {s.status !== 'pending' && <span className="stage-detail op-numeric">{stageDetail(s.stage, c)}</span>}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="stack-3" aria-labelledby="counts-heading">
        <div className="row wrap">
          <h3 id="counts-heading" className="section-heading">
            Counts
          </h3>
          <span className="muted-small">Reported by the worker after each source. No percentage — the total is not known in advance.</span>
        </div>
        <div className="stat-grid">
          <Stat label="Sources processed" value={`${c.sourcesDone} of ${c.sources}`} note={c.sourcesFailed ? `${c.sourcesFailed} failed` : 'none failed'} warn={c.sourcesFailed > 0} />
          <Stat label="Items fetched" value={c.fetched} note="Postings or companies read" />
          <Stat label="Candidates" value={c.candidates} note="Extracted for filtering" />
          <Stat label="Qualified" value={c.qualified} note={`${c.needsVerification} need verification · ${c.excluded} excluded`} />
        </div>
      </section>

      <div className="progress-grid">
        <section className="card stack-3" aria-labelledby="events-heading">
          <div className="row wrap">
            <h3 id="events-heading" className="section-heading">
              Event log
            </h3>
            <span className="muted-small">Safe summaries only — no raw traces or keys</span>
          </div>
          {events.length === 0 ? (
            <p className="muted-small">No events yet.</p>
          ) : (
            <ol className="plain-list event-log">
              {events.map((e, i) => (
                <li key={`${e.at}-${i}`}>
                  <time className="mono muted-small" dateTime={e.at}>
                    {timeOf(e.at)}
                  </time>
                  <span className="event-stage muted-small">{e.stage}</span>
                  {e.level !== 'Info' && <Badge tone={EVENT_LEVEL_TONES[e.level]}>{e.level}</Badge>}
                  <span className="event-message">{e.message}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <aside className="stack-4">
          <section className="card stack-2" aria-labelledby="partial-heading">
            <h3 id="partial-heading" className="section-heading">
              {active ? 'Partial results' : 'Results'}
            </h3>
            <p className="muted-small">
              {active
                ? 'Opportunities are written as each batch is scored. You can work with them while the run continues.'
                : `${found} candidates were filtered in this run.`}
            </p>
            <Link className="btn btn-secondary btn-sm" to={resultsPath}>
              Open list
            </Link>
          </section>
          <section className="card stack-2" aria-labelledby="schedule-heading">
            <div className="row wrap">
              <h3 id="schedule-heading" className="section-heading">
                Scheduling
              </h3>
              <Badge tone="warning">Schedule setup required</Badge>
            </div>
            <dl className="facts facts-compact">
              <div>
                <dt>Time zone</dt>
                <dd>{timeZone}</dd>
              </div>
              <div>
                <dt>Next run</dt>
                <dd>Not scheduled</dd>
              </div>
            </dl>
            <p className="hint">
              There is no verified trigger in this build, so runs start only when you queue them. The host sleeps when
              idle; nothing here claims 24/7 execution.
            </p>
          </section>
          {campaign.data && (
            <Link to={`/campaigns/${campaign.data.id}/edit?step=4`} className="small">
              Back to the campaign
            </Link>
          )}
        </aside>
      </div>
    </div>
  )
}

function Stat({ label, value, note, warn }: { label: string; value: number | string; note: string; warn?: boolean }) {
  return (
    <section className="card stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value op-numeric">{value}</div>
      <div className={`muted-small ${warn ? 'text-warning' : ''}`}>{note}</div>
    </section>
  )
}
