import { useMemo, useState } from 'react'
import { Badge } from '../../components/StatusBadge'
import type { Workspace } from '../shell/shellModel'

function terms(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 12)
}

export function IndeedSearchPanel({ workspace }: { workspace: Workspace }) {
  const [keywords, setKeywords] = useState('')
  const [techStack, setTechStack] = useState('')
  const [company, setCompany] = useState('')
  const [location, setLocation] = useState('')
  const [workMode, setWorkMode] = useState('')
  const [jobType, setJobType] = useState('')
  const [experience, setExperience] = useState('')
  const [postedWithinDays, setPostedWithinDays] = useState('')
  const [exclude, setExclude] = useState('')

  const query = useMemo(() => {
    const parts = [keywords.trim(), ...terms(techStack), company.trim(), workMode, jobType, experience]
    for (const excluded of terms(exclude)) parts.push(`-${excluded.replaceAll(' ', '-')}`)
    return parts.filter(Boolean).join(' ')
  }, [keywords, techStack, company, workMode, jobType, experience, exclude])

  const searchUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (location.trim()) params.set('l', location.trim())
    if (postedWithinDays) params.set('fromage', postedWithinDays)
    return `https://www.indeed.com/jobs?${params}`
  }, [query, location, postedWithinDays])
  const canSearch = Boolean(query || location.trim())

  function clear() {
    setKeywords(''); setTechStack(''); setCompany(''); setLocation(''); setWorkMode(''); setJobType('')
    setExperience(''); setPostedWithinDays(''); setExclude('')
  }

  return <>
    <section className="notice notice-neutral row wrap">
      <Badge tone="warning">Official search handoff</Badge>
      <span className="grow">Indeed does not provide an approved public job-search API for this use. OpportunityPilot builds a precise search and opens it on Indeed; it does not scrape or copy listings.</span>
      <a href="https://docs.indeed.com/api-guides/" target="_blank" rel="noopener noreferrer">Indeed API guide<span className="sr-only"> (opens in a new tab)</span></a>
    </section>

    <section className="panel stack-3">
      <header className="panel-head"><div><h3 className="eyebrow">{workspace === 'candidate' ? 'Find Indeed jobs' : 'Find Indeed hiring signals'}</h3><p className="muted-small">Set only the facts you care about. The generated query stays editable before you open Indeed.</p></div><span className="grow" /><button type="button" className="btn btn-ghost btn-sm" onClick={clear}>Clear</button></header>
      <div className="panel-body filters">
        <label className="field field-wide"><span>{workspace === 'candidate' ? 'Role or keywords' : 'Hiring role or demand signal'}</span><input value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder={workspace === 'candidate' ? 'Backend engineer, platform…' : 'React developer, data engineer…'} /></label>
        <label className="field field-wide"><span>Tech stack</span><input value={techStack} onChange={(event) => setTechStack(event.target.value)} placeholder="React, TypeScript, AWS" /><small>Up to 12 comma-separated technologies.</small></label>
        <label className="field"><span>Company</span><input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Optional company" /></label>
        <label className="field"><span>Location</span><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Bengaluru, India…" /></label>
        <label className="field"><span>Work mode</span><select value={workMode} onChange={(event) => setWorkMode(event.target.value)}><option value="">Any mode</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="in-person">In person</option></select></label>
        <label className="field"><span>Job type</span><select value={jobType} onChange={(event) => setJobType(event.target.value)}><option value="">Any type</option><option value="full-time">Full time</option><option value="part-time">Part time</option><option value="contract">Contract</option><option value="internship">Internship</option></select></label>
        <label className="field"><span>Experience</span><select value={experience} onChange={(event) => setExperience(event.target.value)}><option value="">Any level</option><option value="entry-level">Entry level</option><option value="mid-level">Mid level</option><option value="senior">Senior</option><option value="lead">Lead</option></select></label>
        <label className="field"><span>Date posted</span><select value={postedWithinDays} onChange={(event) => setPostedWithinDays(event.target.value)}><option value="">Any time</option><option value="1">Past 24 hours</option><option value="3">Past 3 days</option><option value="7">Past week</option><option value="14">Past 2 weeks</option></select></label>
        <label className="field field-wide"><span>Exclude terms</span><input value={exclude} onChange={(event) => setExclude(event.target.value)} placeholder="WordPress, agency, unpaid" /><small>Comma-separated terms are added as exclusions to the Indeed query.</small></label>
      </div>
      <div className="panel-foot indeed-search-actions">
        <div><span className="eyebrow">Generated query</span><p className="muted-small">{query || location.trim() || 'Add a role, technology, company or location to begin.'}</p></div>
        {canSearch ? <a className="btn btn-primary" href={searchUrl} target="_blank" rel="noopener noreferrer">Open search on Indeed<span className="sr-only"> (opens in a new tab)</span></a> : <button className="btn btn-primary" type="button" disabled>Open search on Indeed</button>}
      </div>
    </section>

    <section className="panel-grid panel-grid-2">
      <article className="card stack-2"><Badge tone="success">Available now</Badge><h3>{workspace === 'candidate' ? 'Candidate use' : 'Sales use'}</h3><p>{workspace === 'candidate'
        ? 'Open the filtered results on Indeed, review the source listing, apply there, then track the result in OpportunityPilot Applications.'
        : 'Open the filtered results on Indeed, identify companies actively hiring your target stack, then create or update the customer campaign in OpportunityPilot.'}</p></article>
      <article className="card stack-2"><Badge tone="warning">Provider boundary</Badge><h3>No copied listing database</h3><p>Indeed search results, applications, messages and employer data stay on Indeed until an approved partner API and written integration approval are available.</p></article>
    </section>
  </>
}
