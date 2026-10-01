import { useEffect, useMemo, useRef, useState } from 'react'
import { useBlocker, useNavigate, useParams } from 'react-router-dom'
import { ErrorNotice } from '../../components/ErrorNotice'
import { Badge } from '../../components/StatusBadge'
import { api, ApiError } from '../../lib/api'
import type { Profile, ProfileData, ProfileSummary, ProfileType } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import {
  buildSummary,
  confirmationState,
  emptyData,
  FIELDS,
  isFullyConfirmed,
  normalizeData,
  PROFILE_TYPES,
} from './profileFields'

const dateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

export function ProfilesPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const list = useApi<ProfileSummary[]>('/api/v1/profiles')
  const creating = id === 'new'

  // With no selection, open the most recent profile, or the create form when there are none.
  useEffect(() => {
    if (!id && list.data) navigate(list.data.length ? `/profiles/${list.data[0].id}` : '/profiles/new', { replace: true })
  }, [id, list.data, navigate])

  return (
    <div className="page profiles">
      <aside className="profiles-list">
        <div className="row">
          <h2 className="section-heading">Profiles</h2>
          <div className="grow" />
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/profiles/new')}>
            New
          </button>
        </div>
        <p className="muted-small">
          A campaign judges fit against one profile. Keep them separate rather than merging everything into one.
        </p>
        {list.error && <ErrorNotice error={list.error} onRetry={list.reload} />}
        {list.loading && !list.data && <p className="muted-small">Loading profiles…</p>}
        <ul className="stack-2 plain-list">
          {list.data?.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className={`profile-card ${p.id === id ? 'profile-card-active' : ''}`}
                aria-current={p.id === id ? 'true' : undefined}
                onClick={() => navigate(`/profiles/${p.id}`)}
              >
                <span className="row">
                  <span className="profile-card-name">{p.name}</span>
                  <Badge>{p.type}</Badge>
                </span>
                <span className="profile-card-meta">
                  v{p.version} · {dateFmt.format(new Date(p.updatedAt))} ·{' '}
                  {p.confirmedAt ? 'confirmed' : 'awaiting confirmation'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {creating ? (
        <ProfileEditor key="new" onSaved={(p) => { list.reload(); navigate(`/profiles/${p.id}`, { replace: true }) }} />
      ) : id ? (
        <ExistingProfile key={id} id={id} onSaved={list.reload} />
      ) : null}
    </div>
  )
}

function ExistingProfile({ id, onSaved }: { id: string; onSaved: () => void }) {
  const profile = useApi<Profile>(`/api/v1/profiles/${id}`)
  if (profile.error) return <div className="profiles-editor"><ErrorNotice error={profile.error} onRetry={profile.reload} /></div>
  if (!profile.data) return <div className="profiles-editor muted-small">Loading profile…</div>
  return <ProfileEditor key={`${id}-${profile.data.version}`} existing={profile.data} onSaved={() => { onSaved(); profile.reload() }} />
}

function ProfileEditor({ existing, onSaved }: { existing?: Profile; onSaved: (p: Profile) => void }) {
  const [type, setType] = useState<ProfileType>(existing?.type ?? 'Candidate')
  const [name, setName] = useState(existing?.name ?? '')
  const [data, setData] = useState<ProfileData>(() => (existing ? normalizeData(existing.data) : emptyData()))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<Error>()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [justSaved, setJustSaved] = useState(false)
  // Set synchronously on a successful save so the redirect that follows is not treated as leaving unsaved work.
  const savedRef = useRef(false)

  const initial = useMemo(
    () => JSON.stringify({ type: existing?.type ?? 'Candidate', name: existing?.name ?? '', data: existing ? normalizeData(existing.data) : emptyData() }),
    [existing],
  )
  const dirty = JSON.stringify({ type, name, data }) !== initial

  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !savedRef.current && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (window.confirm('You have unsaved profile changes. Leave without saving?')) blocker.proceed()
      else blocker.reset()
    }
  }, [blocker])
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const setField = (key: string, value: string) =>
    setData((d) => ({
      fields: { ...d.fields, [key]: value },
      // Editing a claim clears its confirmation: the new wording has not been confirmed.
      confirmations: { ...d.confirmations, [key]: false },
    }))
  const setConfirmed = (key: string, value: boolean) =>
    setData((d) => ({ ...d, confirmations: { ...d.confirmations, [key]: value } }))

  const fields = FIELDS[type]
  const confirmed = isFullyConfirmed(type, data)
  const state = confirmationState(type, data)
  const summary = buildSummary(type, data)

  async function save() {
    setSaving(true)
    setError(undefined)
    setFieldErrors({})
    const cleaned: ProfileData = {
      fields: Object.fromEntries(fields.map((f) => [f.key, data.fields[f.key] ?? ''])),
      confirmations: Object.fromEntries(fields.filter((f) => f.confirmable).map((f) => [f.key, data.confirmations[f.key] === true])),
    }
    try {
      const saved = existing
        ? await api<Profile>(`/api/v1/profiles/${existing.id}`, {
            method: 'PUT',
            body: JSON.stringify({ name, data: cleaned, confirmed, expectedVersion: existing.version }),
          })
        : await api<Profile>('/api/v1/profiles', {
            method: 'POST',
            body: JSON.stringify({ type, name, data: cleaned, confirmed }),
          })
      savedRef.current = true
      setJustSaved(true)
      setSaving(false)
      onSaved(saved)
    } catch (e) {
      setSaving(false)
      if (e instanceof ApiError && e.fieldErrors) setFieldErrors(e.fieldErrors)
      setError(e as Error)
    }
  }

  const discard = () => {
    const i = JSON.parse(initial) as { type: ProfileType; name: string; data: ProfileData }
    setType(i.type)
    setName(i.name)
    setData(i.data)
    setError(undefined)
  }

  return (
    <div className="profiles-editor">
      <div className="row wrap">
        <div>
          <div className="row">
            <h2 className="editor-title">{existing ? existing.name : 'New profile'}</h2>
            {existing && <Badge>{existing.type}</Badge>}
          </div>
          <p className="muted-small">
            {existing
              ? `Version ${existing.version} · saved ${dateFmt.format(new Date(existing.updatedAt))}`
              : 'Not saved yet'}
            {justSaved && !dirty && ' · Saved'}
          </p>
        </div>
        <div className="grow" />
        <button type="button" className="btn btn-secondary" onClick={discard} disabled={!dirty || saving}>
          Discard changes
        </button>
        <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={!dirty || saving || !name.trim()}>
          {saving ? 'Saving…' : existing ? `Save version ${existing.version + 1}` : 'Create profile'}
        </button>
      </div>

      {error && (
        <ErrorNotice
          error={
            error instanceof ApiError && error.status === 409
              ? new Error(`${error.message} Your edits are still here — copy anything you need, then reload.`)
              : error
          }
        />
      )}

      <div className="editor-body">
        <section className="card editor-form stack-4">
          {!existing && (
            <fieldset className="field">
              <legend>Profile type</legend>
              <div className="type-grid">
                {PROFILE_TYPES.map((t) => (
                  <label key={t.type} className={`type-option ${type === t.type ? 'type-option-active' : ''}`}>
                    <input type="radio" name="ptype" value={t.type} checked={type === t.type} onChange={() => setType(t.type)} />
                    <span className="type-option-label">{t.label}</span>
                    <span className="muted-small">{t.description}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className="field">
            <label htmlFor="pname">Name</label>
            <input id="pname" value={name} maxLength={200} onChange={(e) => setName(e.target.value)} placeholder="e.g. .NET full-stack — contract work" />
            {fieldErrors.name && <p className="field-error">{fieldErrors.name.join(' ')}</p>}
          </div>

          {fields.map((f) => (
            <div className="field" key={f.key}>
              <label htmlFor={`f-${f.key}`}>{f.label}</label>
              <textarea id={`f-${f.key}`} rows={f.rows} value={data.fields[f.key] ?? ''} onChange={(e) => setField(f.key, e.target.value)} />
              {f.hint && <p className="hint">{f.hint}</p>}
              {f.confirmable && data.fields[f.key]?.trim() && (
                <label className="confirm">
                  <input type="checkbox" checked={data.confirmations[f.key] === true} onChange={(e) => setConfirmed(f.key, e.target.checked)} />
                  I confirm this is accurate. Nothing here is strengthened or embellished for me.
                </label>
              )}
            </div>
          ))}
          {fieldErrors.data && <p className="field-error">{fieldErrors.data.join(' ')}</p>}
        </section>

        <aside className="editor-side stack-4">
          <section className="card">
            <div className="row">
              <h3 className="section-heading">Summary used by campaigns</h3>
              <div className="grow" />
              <Badge>From your fields</Badge>
            </div>
            {summary ? <p className="summary">{summary}</p> : <p className="muted-small">Fill in the fields to build the summary.</p>}
            <p className="hint">
              Your own words, joined together — nothing is reworded. When AI features arrive, this is the context sent to
              Gemini; nothing else from your account is.
            </p>
          </section>

          <section className="card">
            <h3 className="section-heading">What is confirmed</h3>
            <ul className="plain-list stack-2 small">
              <li>
                <strong className="text-success">Confirmed by you</strong> — {state.confirmed.length ? state.confirmed.join(', ') : 'nothing yet'}
              </li>
              <li>
                <strong className="text-warning">Awaiting confirmation</strong> — {state.awaiting.length ? state.awaiting.join(', ') : 'none'}
              </li>
              {state.missing.length > 0 && (
                <li className="muted-small">Not provided: {state.missing.join(', ')}. Missing facts stay missing rather than being filled in.</li>
              )}
            </ul>
            <p className="hint">
              This version will be saved as <strong>{confirmed ? 'confirmed' : 'not confirmed'}</strong>.
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}
