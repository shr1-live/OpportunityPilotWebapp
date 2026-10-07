import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorNotice } from '../../components/ErrorNotice'
import { Badge } from '../../components/StatusBadge'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState, LoadingState } from '../../components/States'
import { api } from '../../lib/api'
import type { SalesBid, SalesProject } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { safeHref } from '../opportunities/opportunityModel'
import { isBidFormValid, salesBidStateLabel, salesProjectStateLabel, salesProviderEvidence } from './salesModel'

const EMPTY_BID = { amount: '', currency: 'USD', deliveryDays: '7', proposal: '' }

export function SalesProjectDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const project = useApi<SalesProject>(id ? `/api/v1/sales/projects/${id}` : null)
  const [form, setForm] = useState(EMPTY_BID)
  const [editing, setEditing] = useState<SalesBid>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<Error>()
  const [notice, setNotice] = useState('')

  const formValid = isBidFormValid(form.amount, form.currency, form.deliveryDays, form.proposal)

  function resetForm() {
    setForm(EMPTY_BID)
    setEditing(undefined)
  }

  function editBid(bid: SalesBid) {
    setEditing(bid)
    setForm({
      amount: String(bid.amount),
      currency: bid.currency,
      deliveryDays: String(bid.deliveryDays),
      proposal: bid.proposal,
    })
    globalThis.scrollTo?.({ top: 0, behavior: 'smooth' })
  }

  async function saveBid() {
    if (!project.data || !formValid) return
    setBusy(true)
    setError(undefined)
    const payload = {
      amount: Number(form.amount),
      currency: form.currency,
      deliveryDays: Number(form.deliveryDays),
      proposal: form.proposal.trim(),
    }
    try {
      if (editing) {
        await api<SalesProject>(`/api/v1/sales/bids/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...payload, expectedVersion: editing.version }),
        })
      } else {
        await api<SalesProject>(`/api/v1/sales/projects/${project.data.id}/bid`, {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }
      resetForm()
      project.reload()
    } catch (caught) {
      setError(caught as Error)
    } finally {
      setBusy(false)
    }
  }

  async function approveBid(bidId: string, version: number) {
    setBusy(true)
    setError(undefined)
    try {
      await api<SalesProject>(`/api/v1/sales/bids/${bidId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ version }),
      })
      project.reload()
    } catch (caught) {
      setError(caught as Error)
    } finally {
      setBusy(false)
    }
  }

  async function startHandoff(bid: SalesBid) {
    setBusy(true); setError(undefined); setNotice('')
    try {
      await api<SalesProject>(`/api/v1/sales/bids/${bid.id}/handoff`, { method: 'POST' })
      setNotice('Manual handoff prepared. Open the provider, submit there, then confirm placement here.')
      project.reload()
    } catch (caught) { setError(caught as Error) }
    finally { setBusy(false) }
  }

  async function copyProposal(bid: SalesBid) {
    setError(undefined); setNotice('')
    try {
      await navigator.clipboard.writeText(bid.proposal)
      setNotice(`Approved proposal version ${bid.version} copied. No provider action was performed.`)
    } catch (caught) { setError(caught as Error) }
  }

  async function confirmPlacement(bid: SalesBid) {
    setBusy(true); setError(undefined); setNotice('')
    try {
      await api<SalesProject>(`/api/v1/sales/bids/${bid.id}/confirm-placement`, {
        method: 'POST', body: JSON.stringify({ version: bid.version, confirmed: true }),
      })
      setNotice('Bid placement recorded from your explicit manual confirmation.')
      project.reload()
    } catch (caught) { setError(caught as Error) }
    finally { setBusy(false) }
  }

  if (project.loading && !project.data) {
    return <div className="page"><LoadingState label="Loading project…" waking={project.waking} /></div>
  }
  if (project.error || !project.data) {
    return (
      <div className="page stack-3">
        <ErrorNotice error={project.error ?? new Error('Project not found.')} onRetry={project.reload} what="the sales project" />
        <button className="btn btn-secondary btn-sm" type="button" onClick={() => navigate('/projects')}>Back to projects</button>
      </div>
    )
  }

  const current = project.data
  const sourceUrl = safeHref(current.url)
  const provider = salesProviderEvidence(current)

  return (
    <div className="page page-wide stack-4">
      <PageHeader
        title={current.title}
        subtitle={current.buyer ? `${current.buyer} · ${current.source}` : `Source: ${current.source}`}
        badges={<Badge>{salesProjectStateLabel(current.state)}</Badge>}
        actions={<Link className="btn btn-secondary" to="/projects">Back to projects</Link>}
      />
      {notice ? <p className="notice" role="status" aria-live="polite">{notice}</p> : null}
      {error ? <ErrorNotice error={error} onRetry={() => setError(undefined)} what="the bid" /> : null}
      <div className="panel-grid-2">
        <section className="panel stack-3">
          <header className="panel-head"><h3 className="eyebrow">Project brief</h3></header>
          <div className="panel-body stack-2">
            <p>{current.description || 'No brief was entered.'}</p>
            {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer">Open source page<span className="sr-only"> (opens in a new tab)</span></a> : null}
            {current.externalId ? <p className="muted-small">Provider ID: <code>{current.externalId}</code></p> : null}
            {provider.connectsCost !== undefined && provider.connectsCost !== null ? <p><strong>{provider.connectsCost} Connects</strong> required at the time of import.</p> : null}
            {provider.budget ? <p>Budget/rate: {provider.budget}</p> : null}
            {provider.experienceLevel ? <p>Experience level: {provider.experienceLevel}</p> : null}
            <p className="muted-small">This manual slice never invents an amount, timeline, or claim.</p>
          </div>
        </section>
        <section className="panel stack-3">
          <header className="panel-head"><h3 className="eyebrow">{editing ? `Edit bid version ${editing.version}` : 'Prepare a bid'}</h3></header>
          <div className="panel-body stack-3">
            {editing?.hasValidApproval ? <p className="notice notice-warning">Saving changes clears this version's approval.</p> : null}
            <div className="panel-grid-2">
              <label className="field"><span>Amount</span><input type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm((value) => ({ ...value, amount: event.target.value }))} /></label>
              <label className="field"><span>Currency</span><input value={form.currency} onChange={(event) => setForm((value) => ({ ...value, currency: event.target.value.toUpperCase().slice(0, 3) }))} maxLength={3} /></label>
            </div>
            <label className="field"><span>Delivery days</span><input type="number" min="1" max="3650" value={form.deliveryDays} onChange={(event) => setForm((value) => ({ ...value, deliveryDays: event.target.value }))} /></label>
            <label className="field"><span>Proposal</span><textarea rows={7} value={form.proposal} onChange={(event) => setForm((value) => ({ ...value, proposal: event.target.value }))} maxLength={10000} /></label>
            <p className="muted-small">Amount, ISO currency, delivery time and proposal are required. They are never generated or guessed.</p>
            <div className="row wrap">
              <button className="btn btn-primary" type="button" disabled={busy || !formValid} onClick={saveBid}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Save bid draft'}</button>
              {editing ? <button className="btn btn-secondary" type="button" disabled={busy} onClick={resetForm}>Cancel edit</button> : null}
            </div>
          </div>
        </section>
      </div>
      <section className="panel" aria-labelledby="bids-heading">
        <header className="panel-head"><h3 id="bids-heading" className="eyebrow">Bids</h3></header>
        {current.bids.length === 0 ? (
          <EmptyState title="No bid drafts yet"><p>Enter an amount, delivery window and proposal above.</p></EmptyState>
        ) : (
          <div className="table-scroll" role="region" aria-labelledby="bids-heading" tabIndex={0}>
            <table className="table">
              <caption className="sr-only">Bid drafts for this project.</caption>
              <thead><tr><th>Proposal</th><th>Amount</th><th>Delivery</th><th>State</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>{current.bids.map((bid) => (
                <tr key={bid.id}>
                  <td className="table-role"><span className="clamp-2">{bid.proposal}</span><div className="muted-small">Version {bid.version}</div></td>
                  <td>{bid.amount.toLocaleString()} {bid.currency}</td>
                  <td>{bid.deliveryDays} days</td>
                  <td><Badge tone={bid.hasValidApproval ? 'success' : 'neutral'}>{salesBidStateLabel(bid.state)}</Badge></td>
                  <td><div className="row wrap"><button className="btn btn-secondary btn-sm" type="button" disabled={busy || bid.state === 'Placed'} onClick={() => editBid(bid)}>Edit</button>{!bid.hasValidApproval && bid.state === 'Draft' ? <button className="btn btn-secondary btn-sm" type="button" disabled={busy} onClick={() => approveBid(bid.id, bid.version)}>Approve version {bid.version}</button> : null}{bid.hasValidApproval ? <><button className="btn btn-secondary btn-sm" type="button" disabled={busy} onClick={() => copyProposal(bid)}>Copy approved proposal</button><button className="btn btn-primary btn-sm" type="button" disabled={busy} onClick={() => startHandoff(bid)}>Prepare handoff</button></> : null}{current.state === 'ManualHandoff' && bid.hasValidApproval ? <button className="btn btn-primary btn-sm" type="button" disabled={busy} onClick={() => confirmPlacement(bid)}>Confirm placed manually</button> : null}</div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
