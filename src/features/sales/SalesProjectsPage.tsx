import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorNotice } from '../../components/ErrorNotice'
import { Badge } from '../../components/StatusBadge'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState, LoadingState } from '../../components/States'
import { api } from '../../lib/api'
import type { SalesProject, SalesProjectSource, SalesProjectState } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { SALES_PROJECT_SOURCES, SALES_PROJECT_STATES, salesProjectSourceLabel, salesProjectStateLabel } from './salesModel'

export function SalesProjectsPage() {
  const projects = useApi<SalesProject[]>('/api/v1/sales/projects?take=100')
  const [source, setSource] = useState<SalesProjectSource | ''>('')
  const [state, setState] = useState<SalesProjectState | ''>('')
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [buyer, setBuyer] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<Error>()

  const visible = (projects.data ?? []).filter((p) => (!source || p.source === source) && (!state || p.state === state))

  async function createProject() {
    if (!title.trim()) return
    setSaving(true)
    setSaveError(undefined)
    try {
      await api<SalesProject>('/api/v1/sales/projects', {
        method: 'POST',
        body: JSON.stringify({ source: 'Manual', externalId: null, title: title.trim(), buyer: buyer.trim() || null,
          description: description.trim() || null, url: url.trim() || null, deadlineUtc: null, evidenceJson: '[]' }),
      })
      setTitle(''); setBuyer(''); setDescription(''); setUrl(''); setShowCreate(false)
      projects.reload()
    } catch (e) { setSaveError(e as Error) }
    finally { setSaving(false) }
  }

  return (
    <div className="page page-wide stack-4">
      <PageHeader
        title="Projects & tenders"
        subtitle="Review owner-scoped sales projects and prepare bids only from facts you provide. External discovery is not connected yet."
        actions={<button className="btn btn-primary" type="button" onClick={() => setShowCreate((v) => !v)}>{showCreate ? 'Close' : '+ Add project'}</button>}
      />

      {showCreate && <section className="panel stack-3" aria-labelledby="new-sales-project">
        <header className="panel-head"><h3 id="new-sales-project" className="eyebrow">Manual project</h3></header>
        <div className="panel-body stack-3">
          <div className="panel-grid-2">
            <label className="field"><span>Title <b aria-hidden="true">*</b></span><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} autoFocus /></label>
            <label className="field"><span>Buyer or organisation</span><input value={buyer} onChange={(e) => setBuyer(e.target.value)} maxLength={300} /></label>
          </div>
          <label className="field"><span>Brief</span><textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={8000} /></label>
          <label className="field"><span>Source URL</span><input type="url" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={1000} placeholder="https://…" /></label>
          {saveError && <ErrorNotice error={saveError} onRetry={() => setSaveError(undefined)} what="the project" />}
          <div className="row"><button className="btn btn-primary" type="button" disabled={saving || !title.trim()} onClick={createProject}>{saving ? 'Saving…' : 'Save project'}</button></div>
        </div>
      </section>}

      {projects.error && <ErrorNotice error={projects.error} onRetry={projects.reload} what="sales projects" />}
      {projects.loading && !projects.data && <LoadingState label="Loading sales projects…" waking={projects.waking} rows={4} />}
      {projects.data && projects.data.length === 0 && <EmptyState icon="◇" title="No sales projects yet"><p>Add a project manually to prepare its first bid. Provider discovery will be added in a later N5 slice.</p></EmptyState>}
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
