import { useState, type FormEvent } from 'react'
import { ErrorNotice } from '../../components/ErrorNotice'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState, LoadingState } from '../../components/States'
import { Badge } from '../../components/StatusBadge'
import { api } from '../../lib/api'
import { useApi } from '../../lib/useApi'
import { money } from './staffingModel'
import type { RateCard, RateCardLine, RateCardStatus, RateUnit } from './staffingTypes'

export function StaffingRateCardsPage() {
  const cards = useApi<RateCard[]>('/api/v1/staffing/rate-cards')
  const [editing, setEditing] = useState<RateCard | 'new' | null>(null)
  const [error, setError] = useState<Error>()

  async function setStatus(card: RateCard, status: RateCardStatus) {
    setError(undefined)
    try { await api(`/api/v1/staffing/rate-cards/${card.id}/status`, { method: 'POST', body: JSON.stringify({ status, expectedVersion: card.version }) }); cards.reload() }
    catch (e) { setError(e as Error) }
  }

  return <div className="page page-wide stack-4">
    <PageHeader title="Rate cards" subtitle="Your price list per role. Proposals quote only from an active card and never above its rates; editing an active card raises its version."
      actions={<button className="btn btn-primary" type="button" onClick={() => setEditing('new')}>+ New rate card</button>} />
    {error && <ErrorNotice error={error} />}
    {editing && <RateCardForm key={editing === 'new' ? 'new' : editing.id} card={editing === 'new' ? null : editing} onDone={() => { setEditing(null); cards.reload() }} />}
    {cards.error ? <ErrorNotice error={cards.error} onRetry={cards.reload} what="rate cards" />
      : !cards.data ? <LoadingState label="Loading rate cards…" waking={cards.waking} />
      : cards.data.length === 0 ? <EmptyState title="No rate cards yet">Add the roles you staff and their rates, then activate the card to quote from it.</EmptyState>
      : cards.data.map((c) => <section key={c.id} className="panel">
        <header className="panel-head"><h3 className="eyebrow">{c.name} · v{c.cardVersion}</h3><Badge tone={c.status === 'Active' ? 'success' : 'neutral'}>{c.status}</Badge><span className="grow" />
          {c.status !== 'Retired' && <button className="btn btn-secondary btn-sm" type="button" onClick={() => setEditing(c)}>Edit</button>}
          {c.status === 'Draft' && <button className="btn btn-primary btn-sm" type="button" onClick={() => void setStatus(c, 'Active')}>Activate</button>}
          {c.status !== 'Retired' && <button className="btn btn-secondary btn-sm" type="button" onClick={() => void setStatus(c, 'Retired')}>Retire</button>}
        </header>
        <table className="table"><thead><tr><th>Role</th><th>Seniority</th><th className="num">Rate</th></tr></thead>
          <tbody>{c.lines.map((l, i) => <tr key={i}><td>{l.role}</td><td>{l.seniority ?? '—'}</td><td className="num op-numeric">{money(l.rate, c.currency)} / {l.unit.toLowerCase()}</td></tr>)}</tbody></table>
        {(c.terms || c.validUntil) && <p className="panel-body muted-small">{c.terms}{c.validUntil ? ` · valid until ${c.validUntil}` : ''}</p>}
      </section>)}
  </div>
}

const emptyLine = (): RateCardLine => ({ role: '', seniority: null, unit: 'Hour', rate: 0 })

function RateCardForm({ card, onDone }: { card: RateCard | null; onDone: () => void }) {
  const [name, setName] = useState(card?.name ?? '')
  const [currency, setCurrency] = useState(card?.currency ?? 'USD')
  const [lines, setLines] = useState<RateCardLine[]>(card?.lines.length ? card.lines : [emptyLine()])
  const [terms, setTerms] = useState(card?.terms ?? '')
  const [validUntil, setValidUntil] = useState(card?.validUntil ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<Error>()
  const set = (i: number, patch: Partial<RateCardLine>) => setLines((cur) => cur.map((l, j) => (j === i ? { ...l, ...patch } : l)))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setError(undefined)
    try {
      await api(card ? `/api/v1/staffing/rate-cards/${card.id}` : '/api/v1/staffing/rate-cards', {
        method: card ? 'PUT' : 'POST',
        body: JSON.stringify({ name, currency, lines: lines.filter((l) => l.role.trim()), terms: terms || null, validUntil: validUntil || null, expectedVersion: card?.version ?? null }),
      })
      onDone()
    } catch (err) { setError(err as Error) } finally { setBusy(false) }
  }

  return <form className="panel" onSubmit={(e) => void submit(e)}>
    <header className="panel-head"><h3 className="eyebrow">{card ? `Edit ${card.name}` : 'New rate card'}</h3><span className="grow" /><button className="btn btn-secondary btn-sm" type="button" onClick={onDone}>Close</button></header>
    <div className="panel-body stack-3">
      <div className="filters">
        <label className="field field-wide"><span>Name</span><input required value={name} maxLength={200} onChange={(e) => setName(e.target.value)} placeholder="2026 India delivery" /></label>
        <label className="field"><span>Currency</span><input required value={currency} maxLength={3} onChange={(e) => setCurrency(e.target.value.toUpperCase())} /></label>
        <label className="field"><span>Valid until</span><input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></label>
      </div>
      {lines.map((l, i) => <div key={i} className="filters">
        <label className="field field-wide"><span>Role</span><input value={l.role} maxLength={200} onChange={(e) => set(i, { role: e.target.value })} placeholder=".NET engineer" /></label>
        <label className="field"><span>Seniority</span><input value={l.seniority ?? ''} maxLength={100} onChange={(e) => set(i, { seniority: e.target.value || null })} /></label>
        <label className="field"><span>Rate</span><input type="number" min={0} step="0.01" value={l.rate || ''} onChange={(e) => set(i, { rate: Number(e.target.value) })} /></label>
        <label className="field"><span>Per</span><select value={l.unit} onChange={(e) => set(i, { unit: e.target.value as RateUnit })}><option>Hour</option><option>Day</option><option>Month</option><option>Year</option></select></label>
        <button className="btn btn-secondary btn-sm" type="button" onClick={() => setLines((cur) => cur.filter((_, j) => j !== i))} disabled={lines.length === 1}>Remove</button>
      </div>)}
      <div><button className="btn btn-secondary btn-sm" type="button" onClick={() => setLines((cur) => [...cur, emptyLine()])}>+ Role</button></div>
      <label className="field field-wide"><span>Terms</span><textarea rows={2} maxLength={4000} value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Net 30; rates exclude tax" /></label>
    </div>
    {error && <ErrorNotice error={error} />}
    <div className="panel-foot"><button className="btn btn-primary" type="submit" disabled={busy || !name.trim()}>{busy ? 'Saving…' : 'Save rate card'}</button></div>
  </form>
}
