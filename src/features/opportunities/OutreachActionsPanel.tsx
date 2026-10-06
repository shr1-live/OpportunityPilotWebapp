import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorNotice } from '../../components/ErrorNotice'
import { api } from '../../lib/api'
import type { DraftChannel, NextAction, NextActionKind, OutreachDraft } from '../../lib/types'

const CHANNELS: { value: DraftChannel; label: string }[] = [
  { value: 'Email', label: 'Email' }, { value: 'LinkedInMessage', label: 'LinkedIn message' }, { value: 'ContactForm', label: 'Contact form' },
]

export function OutreachActionsPanel({ opportunityId }: { opportunityId: string }) {
  const [channel, setChannel] = useState<DraftChannel>('Email')
  const [recipient, setRecipient] = useState('')
  const [kind, setKind] = useState<NextActionKind>('FollowUp')
  const [dueAt, setDueAt] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<Error>()
  const [message, setMessage] = useState('')

  async function createDraft() {
    setBusy(true); setError(undefined)
    try {
      await api<OutreachDraft>(`/api/v1/opportunities/${opportunityId}/drafts`, { method: 'POST', body: JSON.stringify({ channel, recipient: recipient || null }) })
      setMessage('Draft created.'); setRecipient('')
    } catch (e) { setError(e as Error) } finally { setBusy(false) }
  }
  async function createAction() {
    if (!dueAt) return
    setBusy(true); setError(undefined)
    try {
      await api<NextAction>(`/api/v1/opportunities/${opportunityId}/next-actions`, { method: 'POST', body: JSON.stringify({ kind, note: note || null, dueAt: new Date(dueAt).toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }) })
      setMessage('Follow-up added.'); setDueAt(''); setNote('')
    } catch (e) { setError(e as Error) } finally { setBusy(false) }
  }
  return <section className="panel" aria-labelledby="outreach-actions-heading"><header className="panel-head"><h3 id="outreach-actions-heading" className="eyebrow">Outreach & next action</h3></header><div className="panel-body stack-3">
    {error && <ErrorNotice error={error} />}{message && <p className="notice notice-success">{message} <Link to="/outreach">Open outreach</Link></p>}
    <label className="field"><span>Draft channel</span><select value={channel} onChange={(e) => setChannel(e.target.value as DraftChannel)}>{CHANNELS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
    <label className="field"><span>Recipient (required for email approval)</span><input value={recipient} onChange={(e) => setRecipient(e.target.value)} maxLength={320} /></label>
    <button className="btn btn-secondary btn-sm" type="button" disabled={busy} onClick={createDraft}>Create draft</button>
    <hr />
    <label className="field"><span>Next action</span><select value={kind} onChange={(e) => setKind(e.target.value as NextActionKind)}><option value="FollowUp">Follow up</option><option value="CheckStatus">Check status</option><option value="Call">Call</option><option value="Other">Other</option></select></label>
    <label className="field"><span>Due</span><input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></label>
    <label className="field"><span>Note</span><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} /></label>
    <button className="btn btn-secondary btn-sm" type="button" disabled={busy || !dueAt} onClick={createAction}>Add next action</button>
  </div></section>
}
