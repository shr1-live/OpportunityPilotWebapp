import { useMemo, useState } from 'react'
import { Badge } from '../../components/StatusBadge'
import type { Workspace } from '../shell/shellModel'
import { BoardLiveResults } from './BoardLiveResults'
import { BOARDS, boardJobsPath, type JobBoard } from './boardModel'

function terms(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 12)
}

/** Search one job board (Indeed, LinkedIn or SEEK): show live postings through JSearch, or open the same search on the board. */
export function BoardSearchPanel({ board, workspace }: { board: JobBoard; workspace: Workspace }) {
  const info = BOARDS[board]
  const [keywords, setKeywords] = useState('')
  const [techStack, setTechStack] = useState('')
  const [company, setCompany] = useState('')
  const [location, setLocation] = useState('')
  const [country, setCountry] = useState(info.countries?.[0].value ?? '')
  const [workMode, setWorkMode] = useState('')
  const [jobType, setJobType] = useState('')
  const [experience, setExperience] = useState('')
  const [postedWithinDays, setPostedWithinDays] = useState('')
  const [exclude, setExclude] = useState('')
  const [livePath, setLivePath] = useState<string | null>(null)

  const query = useMemo(() => {
    const parts = [keywords.trim(), ...terms(techStack), company.trim(), workMode === 'remote' ? '' : workMode, jobType, experience]
    for (const excluded of terms(exclude)) parts.push(`-${excluded.replaceAll(' ', '-')}`)
    return parts.filter(Boolean).join(' ')
  }, [keywords, techStack, company, workMode, jobType, experience, exclude])

  const search = { query, location, workMode, postedWithinDays, country }
  const searchUrl = info.searchUrl(search)
  const canSearch = Boolean(query || location.trim())

  function clear() {
    setKeywords(''); setTechStack(''); setCompany(''); setLocation(''); setWorkMode(''); setJobType('')
    setExperience(''); setPostedWithinDays(''); setExclude(''); setLivePath(null)
  }

  return <>
    <section className="notice notice-neutral row wrap">
      <Badge tone="neutral">How {info.name} jobs get here</Badge>
      <span className="grow">{info.boundary} OpportunityPilot does not scrape it. "Show live {info.name} jobs" reads current postings through JSearch, a licensed Google-for-Jobs data service, and keeps only those published on {info.name}, each with its {info.name} link. "Open search on {info.name}" opens the same search there.</span>
    </section>

    <section className="panel stack-3">
      <header className="panel-head"><div><h3 className="eyebrow">{workspace === 'candidate' ? `Find ${info.name} jobs` : `Find ${info.name} hiring signals`}</h3><p className="muted-small">Set only the facts you care about. The generated query stays visible before you search.</p></div><span className="grow" /><button type="button" className="btn btn-secondary btn-sm" onClick={clear}>Clear</button></header>
      <div className="panel-body filters">
        <label className="field field-wide"><span>{workspace === 'candidate' ? 'Role or keywords' : 'Hiring role or demand signal'}</span><input value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder={workspace === 'candidate' ? 'Backend engineer, platform…' : 'React developer, data engineer…'} /></label>
        <label className="field field-wide"><span>Tech stack</span><input value={techStack} onChange={(event) => setTechStack(event.target.value)} placeholder="React, TypeScript, AWS" /><small>Up to 12 comma-separated technologies.</small></label>
        <label className="field"><span>Company</span><input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Optional company" /></label>
        {info.countries ? <label className="field"><span>Country</span><select value={country} onChange={(event) => setCountry(event.target.value)}>{info.countries.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label> : null}
        <label className="field"><span>Location</span><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder={board === 'Seek' ? 'Sydney, Melbourne…' : 'Bengaluru, India…'} /></label>
        <label className="field"><span>Work mode</span><select value={workMode} onChange={(event) => setWorkMode(event.target.value)}><option value="">Any mode</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="in-person">In person</option></select></label>
        <label className="field"><span>Job type</span><select value={jobType} onChange={(event) => setJobType(event.target.value)}><option value="">Any type</option><option value="full-time">Full time</option><option value="part-time">Part time</option><option value="contract">Contract</option><option value="internship">Internship</option></select></label>
        <label className="field"><span>Experience</span><select value={experience} onChange={(event) => setExperience(event.target.value)}><option value="">Any level</option><option value="entry-level">Entry level</option><option value="mid-level">Mid level</option><option value="senior">Senior</option><option value="lead">Lead</option></select></label>
        <label className="field"><span>Date posted</span><select value={postedWithinDays} onChange={(event) => setPostedWithinDays(event.target.value)}><option value="">Any time</option><option value="1">Past 24 hours</option><option value="3">Past 3 days</option><option value="7">Past week</option><option value="14">Past 2 weeks</option></select></label>
        <label className="field field-wide"><span>Exclude terms</span><input value={exclude} onChange={(event) => setExclude(event.target.value)} placeholder="WordPress, agency, unpaid" /><small>Comma-separated terms are added as exclusions to the query.</small></label>
      </div>
      <div className="panel-foot board-search-actions">
        <div><span className="eyebrow">Generated query</span><p className="muted-small">{query || location.trim() || 'Add a role, technology, company or location to begin.'}</p></div>
        <button className="btn btn-primary" type="button" disabled={!query} onClick={() => setLivePath(boardJobsPath(board, search))}>Show live {info.name} jobs</button>
        {canSearch ? <a className="btn btn-secondary" href={searchUrl} target="_blank" rel="noopener noreferrer">Open search on {info.name}<span className="sr-only"> (opens in a new tab)</span></a> : <button className="btn btn-secondary" type="button" disabled>Open search on {info.name}</button>}
      </div>
    </section>

    <BoardLiveResults board={board} path={livePath} />

    <section className="panel-grid panel-grid-2">
      <article className="card stack-2"><Badge tone="success">Available now</Badge><h3>{workspace === 'candidate' ? 'Candidate use' : 'Sales use'}</h3><p>{workspace === 'candidate'
        ? `Show live ${info.name} jobs or open the search on ${info.name}, review the posting, apply on ${info.name}, then track the result in OpportunityPilot Applications.`
        : `Show live ${info.name} jobs to see which companies are hiring your target stack right now, then create or update the customer campaign in OpportunityPilot.`}</p></article>
      <article className="card stack-2"><Badge tone="warning">Provider boundary</Badge><h3>Read-only, not stored</h3><p>Live results are shown, not saved, and nothing is applied to automatically. Applications, messages and employer data stay on {info.name}. Searches are cached for a few hours to stay within the free JSearch quota.</p></article>
    </section>
  </>
}
