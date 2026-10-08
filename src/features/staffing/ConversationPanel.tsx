import { useState } from 'react'
import { Badge } from '../../components/StatusBadge'
import { useApi } from '../../lib/useApi'
import { inZone, zonedToUtc } from './staffingModel'
import type { StaffingContact } from './staffingTypes'

type Channel = 'Email' | 'LinkedInConnection' | 'LinkedInMessage' | 'InMail' | 'ContactForm' | 'Upwork' | 'Phone' | 'Other'
type Intent = 'Unclassified' | 'Interested' | 'Question' | 'NotNow' | 'NotInterested' | 'Referral' | 'Unsubscribe'
type Message = {
  id: string; direction: 'Outbound' | 'Inbound'; channel: Channel; counterpart: string; subject: string | null; body: string
  state: 'Draft' | 'Approved' | 'Sent' | 'Received'; receipt: string | null; occurredAt: string | null; intent: Intent; suppressed: boolean; version: number
}
type Meeting = {
  id: string; title: string; startsAt: string; timeZone: string; durationMinutes: number; invitees: string; agenda: string | null
  link: string | null; state: 'Proposed' | 'Approved' | 'Invited' | 'Held' | 'Cancelled'; receipt: string | null; outcome: string | null; version: number
}
type Act = <T>(path: string, method: string, body: unknown) => Promise<T | undefined>

const CHANNELS: { value: Channel; label: string; how: string }[] = [
  { value: 'Email', label: 'Email', how: 'Send it from your mailbox, then paste the sent item’s subject or id.' },
  { value: 'LinkedInConnection', label: 'LinkedIn connection note (≤300)', how: 'Open their profile, paste the note into the connection request yourself.' },
  { value: 'LinkedInMessage', label: 'LinkedIn message', how: 'Paste it into LinkedIn yourself; OpportunityPilot never sends on LinkedIn.' },
  { value: 'InMail', label: 'LinkedIn InMail', how: 'Paste it into InMail yourself.' },
  { value: 'ContactForm', label: 'Contact form', how: 'Submit the company’s form yourself.' },
  { value: 'Upwork', label: 'Upwork message', how: 'Send it in Upwork yourself.' },
  { value: 'Phone', label: 'Call script', how: 'Use it on the call, then record the outcome as a reply.' },
  { value: 'Other', label: 'Other', how: 'Send it yourself and record how.' },
]
const INTENTS: Intent[] = ['Interested', 'Question', 'NotNow', 'NotInterested', 'Referral', 'Unsubscribe', 'Unclassified']
const intentLabel = (i: Intent) => i.replace(/([a-z])([A-Z])/g, '$1 $2')

export function ConversationPanel({ base, contacts, busy, act, onChange }: { base: string; contacts: StaffingContact[]; busy: boolean; act: Act; onChange: () => void }) {
  const convo = useApi<{ messages: Message[]; meetings: Meeting[] }>(`${base}/conversation`)
  const run: Act = async <T,>(path: string, method: string, body: unknown) => { const r = await act<T>(path, method, body); convo.reload(); onChange(); return r }
  const [composer, setComposer] = useState<'draft' | 'reply' | 'meeting' | null>(null)
  if (!convo.data) return null
  return <section className="panel">
    <header className="panel-head"><h3 className="eyebrow">Conversation and meetings</h3><span className="grow" />
      <span className="muted-small">Drafted and approved here, sent by you. Replies are recorded with your own reading of them.</span></header>
    <div className="panel-body stack-3">
      <div className="row wrap">
        <button className="btn btn-secondary btn-sm" type="button" onClick={() => setComposer('draft')}>+ Draft message</button>
        <button className="btn btn-secondary btn-sm" type="button" onClick={() => setComposer('reply')}>+ Record a reply</button>
        <button className="btn btn-secondary btn-sm" type="button" onClick={() => setComposer('meeting')}>+ Plan a meeting</button>
      </div>
      {composer === 'draft' && <DraftForm contacts={contacts} busy={busy} onCancel={() => setComposer(null)}
        onSave={(body) => void run(`${base}/messages`, 'POST', body).then((r) => { if (r) setComposer(null) })} />}
      {composer === 'reply' && <ReplyForm contacts={contacts} busy={busy} onCancel={() => setComposer(null)}
        onSave={(body) => void run(`${base}/replies`, 'POST', body).then((r) => { if (r) setComposer(null) })} />}
      {composer === 'meeting' && <MeetingForm busy={busy} onCancel={() => setComposer(null)}
        onSave={(body) => void run(`${base}/meetings`, 'POST', body).then((r) => { if (r) setComposer(null) })} />}

      {convo.data.meetings.map((m) => <MeetingCard key={m.id} m={m} base={base} busy={busy} act={run} />)}
      {convo.data.messages.length === 0 && convo.data.meetings.length === 0 && <p className="muted-small">No messages or meetings yet.</p>}
      {[...convo.data.messages].reverse().map((m) => <MessageCard key={m.id} m={m} base={base} busy={busy} act={run} />)}
    </div>
  </section>
}

function MessageCard({ m, base, busy, act }: { m: Message; base: string; busy: boolean; act: Act }) {
  const url = `${base}/messages/${m.id}`
  const [receipt, setReceipt] = useState('')
  const how = CHANNELS.find((c) => c.value === m.channel)?.how
  return <article className={`card stack-2 ${m.direction === 'Inbound' ? 'msg-in' : ''}`}>
    <div className="row wrap">
      <Badge tone={m.direction === 'Inbound' ? 'primary' : 'neutral'}>{m.direction === 'Inbound' ? 'Reply' : CHANNELS.find((c) => c.value === m.channel)?.label}</Badge>
      <strong>{m.direction === 'Inbound' ? `From ${m.counterpart}` : `To ${m.counterpart}`}</strong>
      <Badge tone={m.state === 'Sent' ? 'success' : m.state === 'Approved' ? 'primary' : 'neutral'}>{m.state}</Badge>
      {m.suppressed && <Badge tone="danger">Suppressed — do not contact</Badge>}
      {m.occurredAt && <span className="muted-small">{new Date(m.occurredAt).toLocaleString()}</span>}
    </div>
    {m.subject && <p className="small"><strong>{m.subject}</strong></p>}
    <p className="pre-wrap small">{m.body}</p>
    {m.state === 'Draft' && !m.suppressed && <div className="row wrap">
      <button className="btn btn-primary btn-sm" type="button" disabled={busy} onClick={() => void act(`${url}/approve`, 'POST', { expectedVersion: m.version })}>Approve exactly this</button>
      <button className="btn btn-secondary btn-sm" type="button" onClick={() => void navigator.clipboard?.writeText(m.body)}>Copy text</button>
    </div>}
    {m.state === 'Approved' && <form className="row wrap" onSubmit={(e) => { e.preventDefault(); if (receipt.trim()) void act(`${url}/sent`, 'POST', { expectedVersion: m.version, receipt: receipt.trim() }) }}>
      <button className="btn btn-secondary btn-sm" type="button" onClick={() => void navigator.clipboard?.writeText(m.body)}>Copy text</button>
      <span className="muted-small grow">{how}</span>
      <input aria-label="Receipt" value={receipt} maxLength={1000} onChange={(e) => setReceipt(e.target.value)} placeholder="Receipt (sent item, time…)" />
      <button className="btn btn-primary btn-sm" type="submit" disabled={busy || !receipt.trim()}>I sent it</button>
    </form>}
    {m.state === 'Sent' && <p className="muted-small">Sent by you: {m.receipt}</p>}
    {m.direction === 'Inbound' && <label className="row"><span className="muted-small">Your reading:</span>
      <select value={m.intent} disabled={busy} onChange={(e) => void act(`${url}/intent`, 'POST', { intent: e.target.value, expectedVersion: m.version })}>
        {INTENTS.map((i) => <option key={i} value={i}>{intentLabel(i)}</option>)}
      </select></label>}
  </article>
}

function DraftForm({ contacts, busy, onSave, onCancel }: { contacts: StaffingContact[]; busy: boolean; onSave: (b: object) => void; onCancel: () => void }) {
  const [channel, setChannel] = useState<Channel>('Email')
  const [contactId, setContactId] = useState('')
  const [recipient, setRecipient] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const pickContact = (id: string) => {
    setContactId(id)
    const c = contacts.find((x) => x.id === id)
    if (c) setRecipient(channel === 'Email' ? c.email ?? c.name : c.linkedInUrl ?? c.name)
  }
  return <form className="filters subtle-box" onSubmit={(e) => { e.preventDefault(); onSave({ contactId: contactId || null, channel, recipient, subject: subject || null, body }) }}>
    <label className="field"><span>Channel</span><select value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>{CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
    {contacts.length > 0 && <label className="field"><span>Contact</span><select value={contactId} onChange={(e) => pickContact(e.target.value)}><option value="">—</option>{contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
    <label className="field field-wide"><span>To</span><input required value={recipient} maxLength={320} onChange={(e) => setRecipient(e.target.value)} placeholder="Email, profile URL or name" /></label>
    {channel === 'Email' && <label className="field field-wide"><span>Subject</span><input value={subject} maxLength={300} onChange={(e) => setSubject(e.target.value)} /></label>}
    <label className="field field-wide"><span>Message</span><textarea required rows={4} maxLength={channel === 'LinkedInConnection' ? 300 : 10000} value={body} onChange={(e) => setBody(e.target.value)} />
      <small>{channel === 'LinkedInConnection' ? `${body.length}/300 · ` : ''}Replace every [placeholder] before approving.</small></label>
    <div className="row"><button className="btn btn-primary btn-sm" type="submit" disabled={busy || !recipient.trim() || !body.trim()}>Save draft</button><button className="btn btn-secondary btn-sm" type="button" onClick={onCancel}>Cancel</button></div>
  </form>
}

function ReplyForm({ contacts, busy, onSave, onCancel }: { contacts: StaffingContact[]; busy: boolean; onSave: (b: object) => void; onCancel: () => void }) {
  const [channel, setChannel] = useState<Channel>('Email')
  const [from, setFrom] = useState('')
  const [body, setBody] = useState('')
  const [intent, setIntent] = useState<Intent>('Unclassified')
  return <form className="filters subtle-box" onSubmit={(e) => { e.preventDefault(); onSave({ channel, from, body, intent, contactId: contacts.find((c) => c.email === from || c.name === from)?.id ?? null }) }}>
    <label className="field"><span>Came by</span><select value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>{CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
    <label className="field field-wide"><span>From</span><input required value={from} maxLength={320} onChange={(e) => setFrom(e.target.value)} list="deal-contacts" /></label>
    <datalist id="deal-contacts">{contacts.map((c) => <option key={c.id} value={c.email ?? c.name} />)}</datalist>
    <label className="field field-wide"><span>What they said (paste or summarise in their words)</span><textarea required rows={3} maxLength={10000} value={body} onChange={(e) => setBody(e.target.value)} /></label>
    <label className="field"><span>Your reading</span><select value={intent} onChange={(e) => setIntent(e.target.value as Intent)}>{INTENTS.map((i) => <option key={i} value={i}>{intentLabel(i)}</option>)}</select>
      {intent === 'Unsubscribe' && <small>They will be added to the suppression list.</small>}</label>
    <div className="row"><button className="btn btn-primary btn-sm" type="submit" disabled={busy || !from.trim() || !body.trim()}>Record reply</button><button className="btn btn-secondary btn-sm" type="button" onClick={onCancel}>Cancel</button></div>
  </form>
}

function MeetingForm({ busy, initial, onSave, onCancel }: { busy: boolean; initial?: Meeting; onSave: (b: object) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? 'Discovery call')
  const [local, setLocal] = useState('')
  const [zone, setZone] = useState(initial?.timeZone ?? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'))
  const [minutes, setMinutes] = useState(String(initial?.durationMinutes ?? 30))
  const [invitees, setInvitees] = useState(initial?.invitees ?? '')
  const [agenda, setAgenda] = useState(initial?.agenda ?? '')
  const [link, setLink] = useState(initial?.link ?? '')
  const utc = local ? zonedToUtc(local, zone) : null
  return <form className="filters subtle-box" onSubmit={(e) => {
    e.preventDefault()
    if (utc) onSave({ title, startsAt: utc, timeZone: zone, durationMinutes: Number(minutes), invitees, agenda: agenda || null, link: link || null, expectedVersion: initial?.version ?? null })
  }}>
    <label className="field field-wide"><span>Title</span><input required value={title} maxLength={300} onChange={(e) => setTitle(e.target.value)} /></label>
    <label className="field"><span>Starts</span><input type="datetime-local" required value={local} onChange={(e) => setLocal(e.target.value)} /></label>
    <label className="field"><span>Time zone</span><input value={zone} onChange={(e) => setZone(e.target.value)} /></label>
    <label className="field"><span>Minutes</span><input type="number" min={5} max={600} value={minutes} onChange={(e) => setMinutes(e.target.value)} /></label>
    <label className="field field-wide"><span>Invitees</span><input required value={invitees} maxLength={2000} onChange={(e) => setInvitees(e.target.value)} placeholder="rao@client.com, you@yourco.com" /></label>
    <label className="field field-wide"><span>Agenda</span><input value={agenda} maxLength={4000} onChange={(e) => setAgenda(e.target.value)} /></label>
    <label className="field field-wide"><span>Meeting link</span><input value={link} maxLength={1000} onChange={(e) => setLink(e.target.value)} /></label>
    <div className="row"><button className="btn btn-primary btn-sm" type="submit" disabled={busy || !utc || !invitees.trim()}>{initial ? 'Save new time' : 'Propose meeting'}</button>
      <button className="btn btn-secondary btn-sm" type="button" onClick={onCancel}>Cancel</button>{local && !utc && <small className="text-danger">Unknown time zone.</small>}</div>
  </form>
}

function MeetingCard({ m, base, busy, act }: { m: Meeting; base: string; busy: boolean; act: Act }) {
  const url = `${base}/meetings/${m.id}`
  const [receipt, setReceipt] = useState('')
  const [outcome, setOutcome] = useState('')
  const [rescheduling, setRescheduling] = useState(false)
  return <article className="card stack-2">
    <div className="row wrap"><Badge tone="primary">Meeting</Badge><strong>{m.title}</strong>
      <Badge tone={m.state === 'Held' ? 'success' : m.state === 'Cancelled' ? 'neutral' : m.state === 'Invited' ? 'primary' : 'warning'}>{m.state}</Badge></div>
    <p className="small">{inZone(m.startsAt, m.timeZone)} · {m.durationMinutes} min · {m.invitees}{m.link ? ` · ${m.link}` : ''}</p>
    {m.agenda && <p className="muted-small">Agenda: {m.agenda}</p>}
    {m.state === 'Proposed' && <div><button className="btn btn-primary btn-sm" type="button" disabled={busy} onClick={() => void act(`${url}/approve`, 'POST', { expectedVersion: m.version })}>Approve this meeting</button></div>}
    {m.state === 'Approved' && <form className="row wrap" onSubmit={(e) => { e.preventDefault(); if (receipt.trim()) void act(`${url}/invited`, 'POST', { expectedVersion: m.version, receipt: receipt.trim() }) }}>
      <span className="muted-small grow">Send the calendar invite yourself, then record it.</span>
      <input aria-label="Invite receipt" value={receipt} maxLength={1000} onChange={(e) => setReceipt(e.target.value)} placeholder="Invite sent from…" />
      <button className="btn btn-primary btn-sm" type="submit" disabled={busy || !receipt.trim()}>Invite sent</button>
    </form>}
    {m.state === 'Invited' && <form className="row wrap" onSubmit={(e) => e.preventDefault()}>
      <input className="grow" aria-label="Outcome" value={outcome} maxLength={4000} onChange={(e) => setOutcome(e.target.value)} placeholder="Outcome (optional)" />
      <button className="btn btn-primary btn-sm" type="button" disabled={busy} onClick={() => void act(`${url}/finish`, 'POST', { held: true, outcome: outcome || null, expectedVersion: m.version })}>Held</button>
      <button className="btn btn-secondary btn-sm" type="button" onClick={() => setRescheduling(true)}>Reschedule</button>
    </form>}
    {(m.state === 'Proposed' || m.state === 'Approved' || m.state === 'Invited') &&
      <div><button className="btn btn-link btn-sm" type="button" disabled={busy} onClick={() => void act(`${url}/finish`, 'POST', { held: false, outcome: null, expectedVersion: m.version })}>Cancel meeting</button></div>}
    {rescheduling && <MeetingForm busy={busy} initial={m} onCancel={() => setRescheduling(false)} onSave={(b) => void act(url, 'PUT', b).then((r) => { if (r) setRescheduling(false) })} />}
    {m.outcome && <p className="muted-small">Outcome: {m.outcome}</p>}
  </article>
}
