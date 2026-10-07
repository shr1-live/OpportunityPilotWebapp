import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorNotice } from '../../components/ErrorNotice'
import { Badge } from '../../components/StatusBadge'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState, LoadingState } from '../../components/States'
import { api } from '../../lib/api'
import type { SalesProject, SalesProjectSource, SalesProjectState, UpworkOpportunity, UpworkOpportunityState } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { SALES_PROJECT_SOURCES, SALES_PROJECT_STATES, salesProjectSourceLabel, salesProjectStateLabel } from './salesModel'

export function SalesProjectsPage() {
  const projects = useApi<SalesProject[]>('/api/v1/sales/projects?take=100')
  const upwork = useApi<UpworkOpportunity[]>('/api/v1/sales/upwork-opportunities?take=100')
  const [source, setSource] = useState<SalesProjectSource | ''>('')
  const [state, setState] = useState<SalesProjectState | ''>('')
  const [showCreate, setShowCreate] = useState(false)
  const [createSource, setCreateSource] = useState<SalesProjectSource>('Upwork')
  const [externalId, setExternalId] = useState('')
  const [title, setTitle] = useState('')
  const [buyer, setBuyer] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [connectsCost, setConnectsCost] = useState('')
  const [availableConnects, setAvailableConnects] = useState('')
  const [experienceLevel, setExperienceLevel] = useState('')
  const [budget, setBudget] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<Error>()

  const visible = (projects.data ?? []).filter((p) => (!source || p.source === source) && (!state || p.state === state))

  const externalIdRequired = createSource !== 'Manual'

  async function createProject() {
    if (!title.trim() || (externalIdRequired && !externalId.trim())) return
    setSaving(true)
    setSaveError(undefined)
    try {
      const evidenceJson = JSON.stringify({ provider: createSource, buyer: buyer.trim() || null,
        budget: budget.trim() || null, importedManually: true, observedAt: new Date().toISOString() })
      if (createSource === 'Upwork') {
        await api<UpworkOpportunity>('/api/v1/sales/upwork-opportunities/import', {
          method: 'POST',
          body: JSON.stringify({ providerJobId: externalId.trim(), title: title.trim(), url: url.trim(),
            summary: description.trim() || null, location: null, budgetType: 'Unknown', budgetMin: null,
            budgetMax: null, currency: null, experienceLevel: experienceLevel.trim() || null,
            connectsRequired: connectsCost ? Number(connectsCost) : null,
            availableConnectsAtReview: availableConnects ? Number(availableConnects) : null,
            paymentVerified: null, postedAt: null, observedAt: new Date().toISOString(), evidenceJson }),
        })
        upwork.reload()
      } else {
        await api<SalesProject>('/api/v1/sales/projects', {
          method: 'POST',
          body: JSON.stringify({ source: createSource, externalId: externalId.trim() || null, title: title.trim(),
            buyer: buyer.trim() || null, description: description.trim() || null, url: url.trim() || null,
            deadlineUtc: null, evidenceJson }),
        })
        projects.reload()
      }
      setExternalId(''); setTitle(''); setBuyer(''); setDescription(''); setUrl(''); setConnectsCost('');
      setAvailableConnects(''); setExperienceLevel(''); setBudget(''); setShowCreate(false)
    } catch (e) { setSaveError(e as Error) }
    finally { setSaving(false) }
  }

  async function decideUpwork(item: UpworkOpportunity, next: UpworkOpportunityState) {
    setSaveError(undefined)
    try {
      await api<UpworkOpportunity>(`/api/v1/sales/upwork-opportunities/${item.id}/decision`, {
        method: 'PATCH', body: JSON.stringify({ state: next, expectedVersion: item.version }),
      })
      upwork.reload()
    } catch (e) { setSaveError(e as Error) }
  }

  async function promoteUpwork(item: UpworkOpportunity) {
    setSaveError(undefined)
    try {
      await api<SalesProject>(`/api/v1/sales/upwork-opportunities/${item.id}/promote`, { method: 'POST' })
      upwork.reload(); projects.reload()
    } catch (e) { setSaveError(e as Error) }
  }

  return (
    <div className="page page-wide stack-4">
      <PageHeader
        title="Projects & tenders"
        subtitle="Import source-linked provider work, review the evidence, then approve an exact bid before any handoff."
        actions={<button className="btn btn-primary" type="button" onClick={() => setShowCreate((v) => !v)}>{showCreate ? 'Close' : '+ Add project'}</button>}
      />

      {showCreate && <section className="panel stack-3" aria-labelledby="new-sales-project">
        <header className="panel-head"><h3 id="new-sales-project" className="eyebrow">Assisted provider import</h3></header>
        <div className="panel-body stack-3">
          <div className="panel-grid-2">
            <label className="field"><span>Source</span><select value={createSource} onChange={(e) => setCreateSource(e.target.value as SalesProjectSource)}>{SALES_PROJECT_SOURCES.map((value) => <option value={value} key={value}>{salesProjectSourceLabel(value)}</option>)}</select></label>
            <label className="field"><span>Provider project ID {externalIdRequired && <b aria-hidden="true">*</b>}</span><input value={externalId} onChange={(e) => setExternalId(e.target.value)} maxLength={200} placeholder="Copy the stable Upwork job ID" /></label>
            <label className="field"><span>Title <b aria-hidden="true">*</b></span><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} autoFocus /></label>
            <label className="field"><span>Buyer or organisation</span><input value={buyer} onChange={(e) => setBuyer(e.target.value)} maxLength={300} /></label>
          </div>
          <label className="field"><span>Brief</span><textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={8000} /></label>
          <label className="field"><span>Source URL</span><input type="url" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={1000} placeholder="https://…" /></label>
          {createSource === 'Upwork' && <div className="panel-grid-2">
            <label className="field"><span>Connects required</span><input type="number" min="0" step="1" value={connectsCost} onChange={(e) => setConnectsCost(e.target.value)} placeholder="Copy the visible cost" /></label>
            <label className="field"><span>Available Connects</span><input type="number" min="0" step="1" value={availableConnects} onChange={(e) => setAvailableConnects(e.target.value)} placeholder="Optional balance snapshot" /></label>
            <label className="field"><span>Experience level</span><input value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)} placeholder="Entry, Intermediate, Expert" /></label>
            <label className="field"><span>Budget or rate</span><input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="$500 fixed or $20–$40/hr" /></label>
          </div>}
          <p className="muted-small">Copy only visible project facts. OpportunityPilot never stores the provider login or claims the bid was submitted.</p>
          {saveError && <ErrorNotice error={saveError} onRetry={() => setSaveError(undefined)} what="the project" />}
          <div className="row"><button className="btn btn-primary" type="button" disabled={saving || !title.trim() || (externalIdRequired && !externalId.trim()) || (createSource === 'Upwork' && !url.trim())} onClick={createProject}>{saving ? 'Saving…' : createSource === 'Upwork' ? 'Save to research queue' : 'Import project'}</button></div>
        </div>
      </section>}

      {upwork.error && <ErrorNotice error={upwork.error} onRetry={upwork.reload} what="the Upwork research queue" />}
      {upwork.data && upwork.data.length > 0 && <section className="panel" aria-labelledby="upwork-queue-heading">
        <header className="panel-head"><div><h3 id="upwork-queue-heading" className="eyebrow">Upwork research queue</h3><p className="muted-small">Research and drafting continue even when Connects are unknown or insufficient. You decide what advances.</p></div></header>
        <div className="table-scroll" role="region" aria-labelledby="upwork-queue-heading" tabIndex={0}><table className="table"><thead><tr><th>Opportunity</th><th>Connects</th><th>Decision</th><th>Actions</th></tr></thead><tbody>
          {upwork.data.map((item) => <tr key={item.id}><td className="table-role"><a href={item.url} target="_blank" rel="noreferrer">{item.title}</a><div className="muted-small">{item.experienceLevel || 'Experience not recorded'}</div></td><td><Badge tone={item.connectsStatus === 'Sufficient' ? 'success' : item.connectsStatus === 'Insufficient' ? 'warning' : 'neutral'}>{item.connectsRequired ?? '?'} required · {item.connectsStatus}</Badge></td><td><Badge>{item.state}</Badge></td><td><div className="row wrap">{item.state !== 'Promoted' && <><button className="btn btn-secondary btn-sm" type="button" onClick={() => decideUpwork(item, 'Shortlisted')}>Shortlist</button><button className="btn btn-ghost btn-sm" type="button" onClick={() => decideUpwork(item, 'Dismissed')}>Dismiss</button></>}{item.state === 'Shortlisted' && <button className="btn btn-primary btn-sm" type="button" onClick={() => promoteUpwork(item)}>Prepare bid</button>}{item.salesProjectId && <Link className="btn btn-secondary btn-sm" to={`/projects/${item.salesProjectId}`}>Open bid</Link>}</div></td></tr>)}
        </tbody></table></div>
      </section>}

      {projects.error && <ErrorNotice error={projects.error} onRetry={projects.reload} what="sales projects" />}
      {projects.loading && !projects.data && <LoadingState label="Loading sales projects…" waking={projects.waking} rows={4} />}
      {projects.data && projects.data.length === 0 && <EmptyState icon="◇" title="No sales projects yet"><p>Import one Upwork test project from visible facts, or add a manual project, to prepare the first exact-version bid.</p></EmptyState>}
      {projects.data && projects.data.length > 0 && <>
        <section className="panel" aria-labelledby="sales-filters">
          <header className="panel-head"><h3 id="sales-filters" className="eyebrow">Filter projects</h3><div className="grow" /></header>
          <div className="panel-body row wrap">
            <label className="pill-select">Source<select value={source} onChange={(e) => setSource(e.target.value as SalesProjectSource | '')}><option value="">All sources</option>{SALES_PROJECT_SOURCES.map((s) => <option key={s} value={s}>{salesProjectSourceLabel(s)}</option>)}</select></label>
            <label className="pill-select">State<select value={state} onChange={(e) => setState(e.target.value as SalesProjectState | '')}><option value="">All states</option>{SALES_PROJECT_STATES.map((s) => <option key={s} value={s}>{salesProjectStateLabel(s)}</option>)}</select></label>
            <span className="muted-small">{visible.length} shown · {projects.data.length} total</span>
          </div>
        </section>
        {visible.length === 0 ? <EmptyState title="No projects match these filters"><button className="btn btn-secondary btn-sm" type="button" onClick={() => { setSource(''); setState('') }}>Clear filters</button></EmptyState> :
          <section className="panel" aria-labelledby="sales-projects-heading">
            <header className="panel-head"><h3 id="sales-projects-heading" className="eyebrow">Your projects</h3></header>
            <div className="table-scroll" role="region" aria-labelledby="sales-projects-heading" tabIndex={0}><table className="table"><caption className="sr-only">Sales projects, newest first.</caption><thead><tr><th>Project</th><th>Source</th><th>State</th><th className="op-num">Bids</th><th>Updated</th></tr></thead><tbody>
              {visible.map((p) => <tr key={p.id}><td className="table-role"><Link to={`/projects/${p.id}`}>{p.title}</Link>{p.buyer && <div className="muted-small">{p.buyer}</div>}</td><td><Badge>{salesProjectSourceLabel(p.source)}</Badge></td><td><Badge tone={p.state === 'BidApproved' ? 'success' : p.state === 'Dismissed' ? 'neutral' : 'primary'}>{salesProjectStateLabel(p.state)}</Badge></td><td className="op-num">{p.bids.length}</td><td className="muted-small"><time dateTime={p.updatedAt}>{new Date(p.updatedAt).toLocaleDateString()}</time></td></tr>)}
            </tbody></table></div>
          </section>}
      </>}
    </div>
  )
}
