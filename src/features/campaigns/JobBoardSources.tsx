import { useState, type FormEvent } from 'react'
import { ErrorNotice } from '../../components/ErrorNotice'
import { Badge, StatusBadge } from '../../components/StatusBadge'
import { api, ApiError } from '../../lib/api'
import type { Campaign, Source } from '../../lib/types'
import { useShell } from '../shell/ShellContext'
import {
  adzunaSearch,
  type AggregateBoardKind,
  BOARD_EXAMPLES,
  type BoardKind,
  fieldError,
  JOB_SOURCE_CAPABILITY,
  type JobSourceKind,
  parseBoardInput,
} from './campaignModel'

/** Capability status for an open job source, read from /api/v1/capabilities — never assumed. */
function SourceCapability({ kind }: { kind: JobSourceKind }) {
  const { capabilities } = useShell()
  const cap = capabilities?.items.find((c) => c.key === JOB_SOURCE_CAPABILITY[kind])
  return (
    <div className="stack-1">
      <div className="row wrap">
        <span className="small">Server status:</span>
        {cap ? <StatusBadge status={cap.status} /> : <Badge>Status unknown</Badge>}
      </div>
      {cap?.detail && <p className="hint">{cap.detail}</p>}
      {!cap && (
        <p className="hint">
          {capabilities
            ? 'This server does not report this source, so it may not support it yet.'
            : 'Server capabilities have not loaded, so its status is not known.'}
        </p>
      )}
    </div>
  )
}

/** Per-company public job-board slug — typed, or derived from a pasted careers link. */
export function BoardForm({ campaign, kind, onAdded }: { campaign: Campaign; kind: BoardKind; onAdded: () => void }) {
  const [input, setInput] = useState('')
  const [label, setLabel] = useState('')
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<Error>()
  const id = kind.toLowerCase()
  const parsed = parseBoardInput(kind, input)
  const example = BOARD_EXAMPLES[kind]
  const what = kind === 'Greenhouse' ? 'Board token' : 'Company slug'

  async function submit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!parsed.token) return
    setBusy(true)
    setError(undefined)
    try {
      await api<Source>(`/api/v1/campaigns/${campaign.id}/sources`, {
        method: 'POST',
        body: JSON.stringify({ kind, url: parsed.token, label: label.trim() || undefined }),
      })
      setInput('')
      setLabel('')
      setTouched(false)
      onAdded()
    } catch (err) {
      setError(err as Error)
    } finally {
      setBusy(false)
    }
  }

  const fe = error instanceof ApiError ? error.fieldErrors : undefined
  const serverError = fieldError(fe, 'url')
  const localError = touched || input.trim() ? parsed.error : undefined
  const shownError = serverError ?? localError
  const describedBy = [`${id}-board-hint`, shownError ? `${id}-board-error` : ''].filter(Boolean).join(' ')

  return (
    <form className="stack-3" onSubmit={(e) => void submit(e)} noValidate>
      <SourceCapability kind={kind} />
      <div className="field">
        <label htmlFor={`${id}-board`}>{what} or board link</label>
        <input
          id={`${id}-board`}
          value={input}
          maxLength={1000}
          autoComplete="off"
          spellCheck={false}
          placeholder={`e.g. ${example.token}`}
          aria-describedby={describedBy}
          aria-invalid={shownError ? true : undefined}
          onChange={(e) => {
            setInput(e.target.value)
            setError(undefined)
          }}
          onBlur={() => setTouched(true)}
        />
        <p id={`${id}-board-hint`} className="hint">
          The company identifier in its careers address — for <code>{example.url}</code> it is <code>{example.token}</code>.
          You can paste the whole link. Jobs are read through {kind}&rsquo;s public
          job-board API: no login, no scraping. One company per source.
        </p>
        {parsed.token && input.trim() !== parsed.token && (
          <p className="muted-small" aria-live="polite">
            {what}: <code>{parsed.token}</code>
          </p>
        )}
        {shownError && (
          <p id={`${id}-board-error`} className="field-error">
            {shownError}
          </p>
        )}
      </div>
      <div className="field">
        <label htmlFor={`${id}-label`}>Label (optional)</label>
        <input id={`${id}-label`} value={label} maxLength={200} onChange={(e) => setLabel(e.target.value)} />
      </div>
      {error && !serverError && <ErrorNotice error={error} />}
      <div className="row wrap">
        <button type="submit" className="btn btn-primary" disabled={busy || !parsed.token}>
          {busy ? 'Adding…' : `Add ${kind} board`}
        </button>
        {!parsed.token && <span className="muted-small">Enter a valid {what.toLowerCase()} or board link first.</span>}
      </div>
    </form>
  )
}

/** Board-wide public feeds with no account identifier or secret. */
export function AggregateBoardForm({ campaign, kind, onAdded }: { campaign: Campaign; kind: AggregateBoardKind; onAdded: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<Error>()
  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(undefined)
    try {
      await api<Source>(`/api/v1/campaigns/${campaign.id}/sources`, {
        method: 'POST',
        body: JSON.stringify({ kind }),
      })
      onAdded()
    } catch (err) {
      setError(err as Error)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form className="stack-3" onSubmit={(e) => void submit(e)}>
      <SourceCapability kind={kind} />
      <p className="small">Reads the public {kind === 'RemoteOk' ? 'Remote OK' : kind} remote-jobs feed on each research run. No login or API key is required.</p>
      {error && <ErrorNotice error={error} />}
      <div><button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Adding…' : `Add ${kind === 'RemoteOk' ? 'Remote OK' : kind}`}</button></div>
    </form>
  )
}

/** Adzuna has no input of its own: it searches with the saved campaign's job titles and first location. */
export function AdzunaForm({ campaign, onAdded }: { campaign: Campaign; onAdded: () => void }) {
  const { capabilities } = useShell()
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<Error>()
  const search = adzunaSearch(campaign.criteria)
  const notConfigured =
    capabilities?.items.find((c) => c.key === JOB_SOURCE_CAPABILITY.Adzuna)?.status === 'NotConfigured'

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(undefined)
    try {
      await api<Source>(`/api/v1/campaigns/${campaign.id}/sources`, {
        method: 'POST',
        body: JSON.stringify({ kind: 'Adzuna', label: label.trim() || undefined }),
      })
      setLabel('')
      onAdded()
    } catch (err) {
      setError(err as Error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="stack-3" onSubmit={(e) => void submit(e)}>
      <SourceCapability kind="Adzuna" />
      {notConfigured && (
        <p className="notice notice-warning">
          Adzuna is not configured on this server (its API keys are missing). You can add the source, but every run will
          report it as failed (&ldquo;Adzuna is not configured on the server&rdquo;) until the keys are set.
        </p>
      )}
      <p className="small">
        Searches Adzuna&rsquo;s job API for India with this campaign&rsquo;s <strong>job titles and search phrases</strong>{' '}
        (the first 3, one search each) in its <strong>first location that is not &ldquo;Remote&rdquo;</strong>. Adzuna
        returns short snippets rather than full postings, so evidence coverage is usually lower.
      </p>
      <dl className="criteria-list">
        <div>
          <dt>Will search for</dt>
          <dd>
            {search.keywords.length ? search.keywords.join(', ') : <span className="text-warning">No job titles yet</span>}
          </dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{search.location ?? <span className="muted-small">None set (only “Remote” or no locations)</span>}</dd>
        </div>
      </dl>
      {search.keywords.length === 0 && (
        <p className="notice notice-warning">
          Add job titles or search phrases in step 2 (Filters) and save — without them an Adzuna search has nothing to
          look for.
        </p>
      )}
      <p className="hint">Read from the saved campaign each time a run starts, so later edits in step 2 apply.</p>
      <div className="field">
        <label htmlFor="adzuna-label">Label (optional)</label>
        <input id="adzuna-label" value={label} maxLength={200} onChange={(e) => setLabel(e.target.value)} />
      </div>
      {error && <ErrorNotice error={error} />}
      <div>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Adding…' : 'Add Adzuna search'}
        </button>
      </div>
    </form>
  )
}
