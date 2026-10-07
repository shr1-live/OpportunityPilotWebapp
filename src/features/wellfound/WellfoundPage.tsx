import { useEffect, useMemo, useRef, useState } from 'react'
import { ErrorNotice } from '../../components/ErrorNotice'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState, LoadingState } from '../../components/States'
import { Badge } from '../../components/StatusBadge'
import { api } from '../../lib/api'
import type { WellfoundApplication, WellfoundApplicationState, WellfoundActivity, WellfoundJob, WellfoundJobState, WellfoundKpis, WellfoundStatus } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { safeHref } from '../opportunities/opportunityModel'
import { useShell } from '../shell/ShellContext'

function Kpi({ label, value, sub }: { label: string; value: number | string; sub: string }) {
  return <div className="kpi"><span className="kpi-label">{label}</span><strong className="kpi-value op-numeric">{value}</strong><span className="muted-small">{sub}</span></div>
}

function money(value: number | null, currency: string | null) {
  if (value === null) return '—'
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 }).format(value)
}

export function WellfoundPage() {
  const { workspace } = useShell()
  const ws = workspace === 'sales' ? 'Sales' : 'Candidate'
  const [keyword, setKeyword] = useState('')
  const [location, setLocation] = useState('')
  const [remoteOnly, setRemoteOnly] = useState(false)
  const [equityOnly, setEquityOnly] = useState(false)
  const [minSalary, setMinSalary] = useState('')
  const [fundingStage, setFundingStage] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<Error>()
  const autoSyncAttempted = useRef(false)

  const jobsPath = useMemo(() => {
    const q = new URLSearchParams({ workspace: ws, take: '100' })
    if (keyword.trim()) q.set('keyword', keyword.trim())
    if (location.trim()) q.set('location', location.trim())
    if (remoteOnly) q.set('remoteOnly', 'true')
    if (equityOnly) q.set('equityOnly', 'true')
    if (minSalary) q.set('minSalary', minSalary)
    if (fundingStage) q.set('fundingStage', fundingStage)
    return `/api/v1/wellfound/jobs?${q}`
  }, [ws, keyword, location, remoteOnly, equityOnly, minSalary, fundingStage])

  const status = useApi<WellfoundStatus>('/api/v1/wellfound/status')
  const jobs = useApi<WellfoundJob[]>(jobsPath)
  const kpis = useApi<WellfoundKpis>(`/api/v1/wellfound/kpis?workspace=${ws}`)
  const applications = useApi<WellfoundApplication[]>(workspace === 'sales' ? '/api/v1/wellfound/applications' : null)
  const activities = useApi<WellfoundActivity[]>('/api/v1/wellfound/activities?take=20')

  function reloadAll() {
    jobs.reload(); kpis.reload(); applications.reload(); activities.reload()
  }

  async function syncPublic() {
    setBusy(true); setActionError(undefined)
    try { await api('/api/v1/wellfound/public/sync', { method: 'POST' }); reloadAll() }
    catch (e) { setActionError(e as Error) }
    finally { setBusy(false) }
  }

  useEffect(() => {
    if (autoSyncAttempted.current || !jobs.data || jobs.loading) return
    if (jobs.data.length === 0 || jobs.data.every((job) => job.isDemo)) {
      autoSyncAttempted.current = true
      void api('/api/v1/wellfound/public/sync', { method: 'POST' })
        .then(() => reloadAll())
        .catch((error) => setActionError(error as Error))
    }
    // This one-shot migration is intentionally keyed only to the first loaded job collection.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs.data, jobs.loading])

  async function changeJob(job: WellfoundJob, state: WellfoundJobState) {
    setActionError(undefined)
    try {
      await api(`/api/v1/wellfound/jobs/${job.id}/state`, { method: 'PATCH', body: JSON.stringify({ state, expectedVersion: job.version }) })
      reloadAll()
    } catch (e) { setActionError(e as Error) }
  }

  async function changeApplication(item: WellfoundApplication, state: WellfoundApplicationState) {
    setActionError(undefined)
    try {
      await api(`/api/v1/wellfound/applications/${item.id}/state`, { method: 'PATCH', body: JSON.stringify({ state, expectedVersion: item.version, confirmed: true }) })
      reloadAll()
    } catch (e) { setActionError(e as Error) }
  }

  const noData = jobs.data?.length === 0 && (!applications.data || applications.data.length === 0)

  return <div className="page page-wide stack-4">
    <PageHeader title={`Wellfound · ${ws}`} subtitle={workspace === 'sales'
      ? 'Research current public hiring signals. Recruiter-owned roles and applicants appear after Wellfound OAuth.'
      : 'Explore current public Wellfound roles and keep local decisions linked to the original posting.'}
      actions={<button className="btn btn-primary" type="button" disabled={busy} onClick={syncPublic}>{busy ? 'Refreshing…' : 'Refresh live jobs'}</button>} />

    {status.data && <section className="notice notice-neutral row wrap"><Badge tone="success">Public jobs live</Badge><Badge tone="warning">Recruit MCP not connected</Badge><span className="grow">{status.data.detail}</span><a href="https://help.wellfound.com/article/1219-connect-wellfound-to-your-ai-assistant" target="_blank" rel="noreferrer">Recruit connection requirements</a></section>}
    {actionError && <ErrorNotice error={actionError} onRetry={() => setActionError(undefined)} what="the Wellfound action" />}

    {kpis.data && <div className="kpi-strip kpi-strip-5">
      {workspace === 'candidate' ? <>
        <Kpi label="Matching roles" value={jobs.data?.length ?? kpis.data.jobs} sub="active filters" />
        <Kpi label="Saved" value={kpis.data.saved} sub="your review list" />
        <Kpi label="Applied" value={kpis.data.applied} sub="locally confirmed" />
        <Kpi label="Interviewing" value={kpis.data.interviewing} sub="tracked outcomes" />
        <Kpi label="Offers" value={kpis.data.offered} sub="tracked outcomes" />
      </> : <>
        <Kpi label="Owned jobs" value={kpis.data.jobs} sub="recruiter scope" />
        <Kpi label="Hiring signals" value={kpis.data.discoveryJobs} sub="public role research" />
        <Kpi label="Applicants" value={kpis.data.applicants} sub="visible applications" />
        <Kpi label="Reviewing" value={kpis.data.reviewing} sub="in progress" />
        <Kpi label="Shortlisted" value={kpis.data.shortlisted} sub="human decision" />
        <Kpi label="Rejected" value={kpis.data.rejected} sub="human decision" />
      </>}
    </div>}

    {workspace === 'candidate' && <section className="panel stack-3">
      <header className="panel-head"><h3 className="eyebrow">Find startup roles</h3><span className="muted-small">Filters update the stored listing results</span></header>
      <div className="panel-body filters">
        <label className="field field-wide"><span>Role, company or skill</span><input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Backend, Python, Stripe…" /></label>
        <label className="field"><span>Location</span><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="India, Remote…" /></label>
        <label className="field"><span>Minimum salary</span><input type="number" min="0" value={minSalary} onChange={(e) => setMinSalary(e.target.value)} placeholder="100000" /></label>
        <label className="field"><span>Funding</span><select value={fundingStage} onChange={(e) => setFundingStage(e.target.value)}><option value="">Any stage</option><option>Seed</option><option>Series A</option><option>Series B</option><option>Series E</option></select></label>
        <label className="check-row"><input type="checkbox" checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} />Remote only</label>
        <label className="check-row"><input type="checkbox" checked={equityOnly} onChange={(e) => setEquityOnly(e.target.checked)} />Equity offered</label>
      </div>
    </section>}

    {(jobs.loading || applications.loading) && !jobs.data && <LoadingState label="Loading Wellfound workspace…" rows={4} />}
    {jobs.error && <ErrorNotice error={jobs.error} onRetry={jobs.reload} what="Wellfound jobs" />}
    {noData && <EmptyState icon="◇" title="No public Wellfound jobs yet" actions={<button className="btn btn-primary btn-sm" onClick={syncPublic}>Fetch live public jobs</button>}>Refresh the anonymous public Wellfound jobs page. Recruiter-owned jobs and applicants remain OAuth-only.</EmptyState>}

    {jobs.data && jobs.data.length > 0 && <section className="wellfound-grid" aria-label="Wellfound jobs">
      {jobs.data.map((job) => <article className="card wellfound-card stack-3" key={job.id}>
        <div className="row wrap"><Badge tone={job.isDemo ? 'warning' : 'success'}>{job.isDemo ? 'Legacy demo' : job.scope === 'RecruiterOwned' ? 'OAuth synced' : 'Live public listing'}</Badge><Badge>{job.scope === 'RecruiterOwned' ? 'Recruiter role' : workspace === 'sales' ? 'Hiring signal' : 'Candidate role'}</Badge>{job.matchScore !== null && <Badge tone="primary">{job.matchScore}% match</Badge>}<span className="grow" /><Badge>{job.state}</Badge></div>
        <div><h3>{job.title}</h3><p className="muted-small">{job.companyName} · {job.fundingStage || 'Funding unknown'} · {job.employeeCount || 'Size unknown'}</p></div>
        <div className="row wrap"><Badge>{job.remoteType || 'Work mode unknown'}</Badge><Badge>{job.location || 'Location unknown'}</Badge>{job.visaSponsorship === true && <Badge tone="success">Visa sponsorship</Badge>}</div>
        <div className="wellfound-comp"><span><small>Salary</small><strong>{money(job.salaryMin, job.currency)} – {money(job.salaryMax, job.currency)}</strong></span><span><small>Equity</small><strong>{job.equityMin ?? '—'}% – {job.equityMax ?? '—'}%</strong></span></div>
        <p>{job.summary}</p><div className="row wrap">{job.skills.map((skill) => <Badge key={skill}>{skill}</Badge>)}</div>
        <div className="row wrap">{safeHref(job.applyUrl) && <a className="btn btn-secondary btn-sm" href={safeHref(job.applyUrl)!} target="_blank" rel="noopener noreferrer">Open Wellfound<span className="sr-only"> (opens in a new tab)</span></a>}{workspace === 'candidate' && <><button className="btn btn-primary btn-sm" type="button" onClick={() => changeJob(job, 'Saved')}>Save</button><button className="btn btn-ghost btn-sm" type="button" onClick={() => changeJob(job, 'Applied')}>Mark applied</button></>}</div>
      </article>)}
    </section>}

    {workspace === 'sales' && applications.data && applications.data.length > 0 && <section className="panel">
      <header className="panel-head"><div><h3 className="eyebrow">Applicant review</h3><p className="muted-small">Demo actions are local only. Live accept/reject will require a fresh MCP confirmation.</p></div></header>
      <div className="table-scroll"><table className="table"><thead><tr><th>Candidate</th><th>Role</th><th>Fit</th><th>State</th><th>Decision</th></tr></thead><tbody>{applications.data.map((item) => <tr key={item.id}><td className="table-role">{item.candidateName}<div className="muted-small">{item.isDemo ? 'Demo applicant' : 'Provider applicant'}</div></td><td>{item.jobTitle}</td><td className="op-num">{item.fitScore ?? '—'}%</td><td><Badge>{item.state}</Badge></td><td><div className="row wrap"><button className="btn btn-primary btn-sm" onClick={() => changeApplication(item, 'Shortlisted')}>Shortlist</button><button className="btn btn-secondary btn-sm" onClick={() => changeApplication(item, 'Reviewing')}>Review</button><button className="btn btn-ghost btn-sm" onClick={() => changeApplication(item, 'Rejected')}>Not a fit</button></div></td></tr>)}</tbody></table></div>
    </section>}

    {workspace === 'sales' && applications.data?.length === 0 && <section className="notice notice-neutral"><strong>Recruiter applicants are not connected.</strong> Public hiring signals above are live; private jobs and applicants require Wellfound Recruit OAuth.</section>}

    {activities.data && activities.data.length > 0 && <section className="panel"><header className="panel-head"><h3 className="eyebrow">Wellfound activity</h3><span className="muted-small">{activities.data.length} recent events</span></header><ul className="state-list panel-body">{activities.data.map((item) => <li key={item.id}><span><strong>{item.kind}</strong><br /><span className="muted-small">{item.detail}</span></span><time className="muted-small" dateTime={item.occurredAt}>{new Date(item.occurredAt).toLocaleString()}</time></li>)}</ul></section>}
  </div>
}
