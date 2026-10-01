import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ErrorNotice } from '../../components/ErrorNotice'
import { Badge } from '../../components/StatusBadge'
import { api, ApiError } from '../../lib/api'
import type { AgentKey, CreatedAgentKey } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { useShell } from '../shell/ShellContext'
import { formatWhen } from './applicationStatus'

export const AGENT_SETUP_ID = 'apply-agent'

const dateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

const STEPS: { title: string; code: string; note?: string }[] = [
  {
    title: 'Install the agent',
    code: 'cd OpportunityPilotWebApi/agent\nnpm install\nnpx playwright install chromium',
    note: 'Run these from a copy of the OpportunityPilotWebApi repository.',
  },
  {
    title: 'Create its config',
    code: 'npm run agent -- init',
    note: 'Creates config.json — fill in your search, answers and the agent key.',
  },
  {
    title: 'Log in once',
    code: 'npm run agent -- login linkedin',
    note: 'Log in in the window that opens; repeat with naukri.',
  },
  {
    title: 'Do a dry run',
    code: 'npm run agent -- run linkedin',
    note: 'Dry run: fills forms, does not submit.',
  },
  {
    title: 'Send real applications',
    code: 'npm run agent -- run linkedin --submit',
    note: 'Submits the applications for real. Check a dry run first.',
  },
]

function CopyButton({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  async function copy() {
    clearTimeout(timer.current)
    try {
      // navigator.clipboard is missing outside secure contexts, which also lands in the catch.
      await navigator.clipboard.writeText(text)
      setState('copied')
      timer.current = setTimeout(() => setState('idle'), 2000)
    } catch {
      setState('failed')
    }
  }

  return (
    <span className="copy">
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => void copy()}>
        {state === 'copied' ? 'Copied' : 'Copy'}
        <span className="sr-only"> {label}</span>
      </button>
      <span className="muted-small" role="status">
        {state === 'failed' ? 'Copying is blocked here. Select the text and copy it yourself.' : ''}
      </span>
    </span>
  )
}

/** How to connect the local apply agent, and the keys it uses to report back. */
export function AgentSetup() {
  const { capabilities } = useShell()
  const demo = capabilities?.temporaryStorage === true

  return (
    <section id={AGENT_SETUP_ID} className="card stack-4" tabIndex={-1} aria-labelledby="agent-setup-heading">
      <div className="row wrap">
        <h3 id="agent-setup-heading" className="section-heading">
          Apply agent
        </h3>
        <Badge tone="primary">Local agent · beta</Badge>
      </div>
      <p className="page-sub">
        The agent runs on your computer and uses your own LinkedIn or Naukri login in a browser window you can watch. It
        fills applications from your saved answers, never guesses missing ones, and starts in dry-run mode (fills forms,
        does not submit).
      </p>
      <p className="notice notice-warning">
        <strong>Unofficial automation.</strong> LinkedIn and Naukri terms prohibit automated use and may restrict your
        account. Keep the daily limits low.
      </p>

      <AgentKeys />

      <div className="stack-3">
        <h4 className="section-heading">Set it up</h4>
        <ol className="setup-steps">
          {STEPS.map((step, i) => (
            <li key={step.title} className="stack-2">
              <div className="setup-step-title">{step.title}</div>
              {step.note && <p className="muted-small">{step.note}</p>}
              <div className="code-block">
                <pre>
                  <code>{step.code}</code>
                </pre>
                <CopyButton text={step.code} label={`step ${i + 1} commands`} />
              </div>
            </li>
          ))}
        </ol>
      </div>

      <p className={demo ? 'notice notice-neutral' : 'hint'}>
        {demo ? 'This server is in demo mode, so it' : 'In demo mode the API'} forgets applications and agent keys when
        it restarts. The agent keeps its own log on your computer: create a new key, put it in config.json and run{' '}
        <code>npm run agent -- sync</code> to upload the log again.
      </p>
    </section>
  )
}

function AgentKeys() {
  const keys = useApi<AgentKey[]>('/api/v1/agent-keys')
  const [name, setName] = useState('My computer')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<Error>()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [created, setCreated] = useState<CreatedAgentKey | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [revokeError, setRevokeError] = useState<Error>()

  async function create(e: FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateError(undefined)
    setFieldErrors({})
    try {
      const key = await api<CreatedAgentKey>('/api/v1/agent-keys', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
      })
      setCreated(key)
      keys.reload()
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setFieldErrors(err.fieldErrors)
      setCreateError(err as Error)
    } finally {
      setCreating(false)
    }
  }

  async function revoke(key: AgentKey) {
    if (!window.confirm(`Revoke “${key.name}”? An agent using it can no longer report results until you give it a new key.`))
      return
    setRevoking(key.id)
    setRevokeError(undefined)
    try {
      await api<void>(`/api/v1/agent-keys/${key.id}`, { method: 'DELETE' })
      if (created?.id === key.id) setCreated(null)
      keys.reload()
    } catch (err) {
      setRevokeError(err as Error)
    } finally {
      setRevoking(null)
    }
  }

  // ASP.NET may key validation errors by the property name, so accept either casing.
  const nameErrors = fieldErrors.name ?? fieldErrors.Name ?? []

  return (
    <div className="stack-3">
      <h4 className="section-heading">Agent keys</h4>
      <p className="muted-small">
        The agent sends its results with a personal key instead of your sign-in. Revoke a key to cut that computer off.
      </p>

      {keys.error && <ErrorNotice error={keys.error} onRetry={keys.reload} />}
      {revokeError && <ErrorNotice error={revokeError} />}
      {keys.loading && !keys.data && <p className="muted-small">Loading agent keys…</p>}
      {keys.data && keys.data.length === 0 && <p className="muted-small">No agent keys yet.</p>}
      {keys.data && keys.data.length > 0 && (
        <ul className="plain-list key-list">
          {keys.data.map((k) => (
            <li key={k.id} className="row wrap">
              <div className="grow">
                <div>
                  <strong>{k.name}</strong> <span className="mono muted-small">{k.prefix}…</span>
                </div>
                <div className="muted-small">
                  Created {dateFmt.format(new Date(k.createdAt))} ·{' '}
                  {k.lastUsedAt ? `last used ${formatWhen(k.lastUsedAt)}` : 'never used'}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={revoking === k.id}
                onClick={() => void revoke(k)}
              >
                {revoking === k.id ? 'Revoking…' : 'Revoke'}
                <span className="sr-only"> {k.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {created && (
        <div className="notice notice-warning key-reveal" role="status">
          <p>
            <strong>Copy it now — it is shown only once.</strong> Paste it into the agent’s <code>config.json</code> as{' '}
            <code>api.key</code>.
          </p>
          <div className="code-block">
            <pre>
              <code>{created.key}</code>
            </pre>
            <CopyButton text={created.key} label={`agent key ${created.name}`} />
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCreated(null)}>
            I have copied it
          </button>
        </div>
      )}

      <form className="key-form" onSubmit={(e) => void create(e)}>
        <div className="field grow">
          <label htmlFor="agent-key-name">Key name</label>
          <input
            id="agent-key-name"
            value={name}
            maxLength={100}
            required
            aria-invalid={nameErrors.length > 0 || undefined}
            aria-describedby={nameErrors.length ? 'agent-key-name-error' : undefined}
            onChange={(e) => setName(e.target.value)}
          />
          {nameErrors.length > 0 && (
            <p id="agent-key-name-error" className="field-error">
              {nameErrors.join(' ')}
            </p>
          )}
        </div>
        <button type="submit" className="btn btn-primary" disabled={creating || !name.trim()}>
          {creating ? 'Creating…' : 'Create agent key'}
        </button>
      </form>
      {createError && nameErrors.length === 0 && <ErrorNotice error={createError} />}
    </div>
  )
}
