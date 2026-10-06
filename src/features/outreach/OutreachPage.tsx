import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorNotice } from '../../components/ErrorNotice'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState, LoadingState } from '../../components/States'
import { Badge } from '../../components/StatusBadge'
import { api } from '../../lib/api'
import type { DraftListItem, DraftPage, OutreachDraft } from '../../lib/types'
import { useApi } from '../../lib/useApi'

export function OutreachPage() {
  const drafts = useApi<DraftPage>('/api/v1/drafts?take=100')
  const [selected, setSelected] = useState<OutreachDraft>()
  const [body, setBody] = useState('')
  const [recipient, setRecipient] = useState('')
  const [subject, setSubject] = useState('')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<Error>()

  async function open(item: DraftListItem) {
    setError(undefined)
    try {
      const row = await api<OutreachDraft>(`/api/v1/drafts/${item.id}`)
      setSelected(row); setBody(row.body); setRecipient(row.recipient ?? ''); setSubject(row.subject ?? '')
    } catch (e) { setError(e as Error) }
  }

  async function mutate(action: 'save' | 'approve' | 'revoke') {
    if (!selected) return
    setWorking(true); setError(undefined)
    try {
      const path = action === 'save' ? `/api/v1/drafts/${selected.id}` : `/api/v1/drafts/${selected.id}/${action === 'approve' ? 'approve' : 'revoke-approval'}`
      const init = action === 'save'
        ? { method: 'PUT', body: JSON.stringify({ recipient: recipient || null, subject: subject || null, body, expectedVersion: selected.version }) }
        : { method: 'POST', ...(action === 'approve' ? { body: JSON.stringify({ version: selected.version }) } : {}) }
      const row = await api<OutreachDraft>(path, init)
      setSelected(row); setBody(row.body); setRecipient(row.recipient ?? ''); setSubject(row.subject ?? ''); drafts.reload()
    } catch (e) { setError(e as Error) }
    finally { setWorking(false) }
  }

  return <div className="page page-wide stack-4">
    <PageHeader title="Outreach" subtitle="Review every message, edit it safely, and approve the exact version you intend to use." />
    {error && <ErrorNotice error={error} onRetry={() => setError(undefined)} what="the draft" />}
    {drafts.error && <ErrorNotice error={drafts.error} onRetry={drafts.reload} what="outreach drafts" />}
    {drafts.loading && !drafts.data && <LoadingState label="Loading outreach drafts…" waking={drafts.waking} rows={4} />}
    {drafts.data?.items.length === 0 && <EmptyState title="No outreach drafts yet"><p>Open an opportunity and create a cover note, email, LinkedIn message, or contact-form draft.</p><Link className="btn btn-primary" to="/opportunities">Browse opportunities</Link></EmptyState>}
    {drafts.data && drafts.data.items.length > 0 && <div className="outreach-grid">
      <section className="panel"><header className="panel-head"><h2 className="eyebrow">Draft inbox</h2><span className="grow" /><span className="muted-small">{drafts.data.total} total</span></header>
        <ul className="inbox-list">{drafts.data.items.map((item) => <li key={item.id}>
          <button type="button" className={selected?.id === item.id ? 'inbox-item is-selected' : 'inbox-item'} onClick={() => open(item)}>
            <span><strong>{item.opportunityTitle}</strong><small>{item.organization || 'Unknown organisation'} · {item.channel}</small></span>
            <Badge tone={item.state === 'Approved' ? 'success' : 'warning'}>{item.state}</Badge>
          </button>
        </li>)}</ul>
      </section>
      <section className="panel"><header className="panel-head"><h2 className="eyebrow">Editor</h2></header>
        {!selected ? <div className="panel-body muted">Select a draft to review it.</div> : <div className="panel-body stack-3">
          <div className="row wrap"><Badge>{selected.channel}</Badge><Badge tone={selected.state === 'Approved' ? 'success' : 'warning'}>{selected.state} · v{selected.version}</Badge><Link to={`/opportunities/${selected.opportunityId}`}>Open opportunity</Link></div>
          <label className="field"><span>Recipient</span><input value={recipient} onChange={(e) => setRecipient(e.target.value)} maxLength={320} /></label>
          {selected.channel === 'Email' && <label className="field"><span>Subject</span><input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={300} /></label>}
          <label className="field"><span>Message</span><textarea rows={14} value={body} onChange={(e) => setBody(e.target.value)} maxLength={10000} /></label>
          {selected.sendBlockers.length > 0 && <ul className="hint-list">{selected.sendBlockers.map((x) => <li key={x}>{x}</li>)}</ul>}
          <div className="row wrap"><button className="btn btn-secondary" type="button" disabled={working || !body.trim()} onClick={() => mutate('save')}>Save new version</button>
            {selected.state === 'Approved' ? <button className="btn btn-secondary" type="button" disabled={working} onClick={() => mutate('revoke')}>Revoke approval</button> : <button className="btn btn-primary" type="button" disabled={working || !body.trim()} onClick={() => mutate('approve')}>Approve version {selected.version}</button>}
            <button className="btn btn-secondary" type="button" onClick={() => navigator.clipboard.writeText(body)}>Copy</button></div>
        </div>}
      </section>
    </div>}
  </div>
}
