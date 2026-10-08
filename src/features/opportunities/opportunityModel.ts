import type {
  AppliesVia,
  CriterionValue,
  FilterOutcome,
  JobPlatform,
  OpportunityFact,
  OpportunityStatus,
  OpportunitySummary,
} from '../../lib/types'

export const PAGE_SIZE = 50

export const OUTCOME_LABELS: Record<FilterOutcome, { text: string; tone: string }> = {
  Qualified: { text: 'Qualified', tone: 'success' },
  NeedsVerification: { text: 'Needs verification', tone: 'warning' },
  Excluded: { text: 'Excluded', tone: 'neutral' },
}

export const STATUS_LABELS: Record<OpportunityStatus, { text: string; tone: string }> = {
  New: { text: 'New', tone: 'neutral' },
  Suggested: { text: 'Awaiting approval', tone: 'warning' },
  Shortlisted: { text: 'Shortlisted', tone: 'primary' },
  Dismissed: { text: 'Dismissed', tone: 'neutral' },
  Applied: { text: 'Applied', tone: 'success' },
  Contacted: { text: 'Contacted', tone: 'primary' },
  Responded: { text: 'Responded', tone: 'primary' },
  Interested: { text: 'Interested', tone: 'success' },
  Closed: { text: 'Closed', tone: 'neutral' },
}

export const STATUSES = Object.keys(STATUS_LABELS) as OpportunityStatus[]

/** Statuses a user may pick by hand. Suggested is set by research only (it can be shown, not chosen). */
export function settableStatuses(current: OpportunityStatus): OpportunityStatus[] {
  if (current === 'Applied') return ['Applied']
  return STATUSES.filter((s) => s !== 'Suggested' || s === current)
}

export const PLATFORM_LABELS: Record<JobPlatform, string> = {
  LinkedIn: 'LinkedIn',
  Naukri: 'Naukri',
  Instahyre: 'InstaHyre',
  Greenhouse: 'Greenhouse',
  Lever: 'Lever',
  Adzuna: 'Adzuna',
  Ashby: 'Ashby',
  SmartRecruiters: 'SmartRecruiters',
  Recruitee: 'Recruitee',
  Workable: 'Workable',
  Indeed: 'Indeed',
  Remotive: 'Remotive',
  RemoteOk: 'Remote OK',
  Other: 'Other',
}

/** Platform words for a row; "Other" and unknown are left out rather than shown as a platform. */
export function platformLabel(platform: JobPlatform | null | undefined): string | null {
  if (!platform || platform === 'Other') return null
  return PLATFORM_LABELS[platform] ?? platform
}

/** The local agent applies only on supported signed-in platforms; everywhere else the user opens the application page. */
export function appliesViaForPlatform(platform: JobPlatform | null | undefined): AppliesVia {
  return platform === 'LinkedIn' || platform === 'Naukri' || platform === 'Instahyre' ? 'Agent' : 'You'
}

/** "Applies via: …" wording for the approval queue and detail page. */
export function appliesViaLabel(via: AppliesVia, platform: JobPlatform | null | undefined): string {
  if (via === 'Agent') {
    const where = platform === 'LinkedIn' || platform === 'Naukri' || platform === 'Instahyre' ? platform : 'LinkedIn/Naukri/InstaHyre'
    return `your agent (${where})`
  }
  return 'you (opens the application page)'
}

/** Open job boards found by research: the agent never applies there, the user opens applyUrl and marks it applied. */
export function isUserApplyBoard(platform: JobPlatform | null | undefined): boolean {
  return platform !== null && platform !== undefined && platform !== 'LinkedIn' && platform !== 'Naukri' && platform !== 'Instahyre' && platform !== 'Other'
}

/** Unknown is its own answer, never folded into "not met": it scores 0 but lowers coverage instead. */
export function valueLabel(value: CriterionValue): { text: string; tone: string } {
  if (value === null || value === undefined) return { text: 'Unknown', tone: 'neutral' }
  if (value >= 1) return { text: 'Met', tone: 'success' }
  if (value > 0) return { text: 'Partly', tone: 'warning' }
  return { text: 'Not met', tone: 'danger' }
}

/** "Fit 82/100" — a rank against the user's criteria, never a probability. */
export function formatScore(score: number): string {
  return `${clampPercent(score)}/100`
}

export function formatCoverage(coverage: number): string {
  return `coverage ${clampPercent(coverage)}%`
}

/** "32 / 35" with points rounded to whole numbers, as the score itself is. */
export function formatPoints(points: number, weight: number): string {
  return `${Math.round(points)} / ${Math.round(weight)}`
}

function clampPercent(n: number): number {
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 0
}

/** Rules extraction quotes its source; anything inferred or without evidence says so. */
export function factLabel(fact: Pick<OpportunityFact, 'evidenceId' | 'isInference'>): { text: string; tone: string } {
  if (fact.isInference) return { text: 'Inferred', tone: 'warning' }
  if (fact.evidenceId) return { text: 'Verified', tone: 'success' }
  return { text: 'Not verified', tone: 'neutral' }
}

export interface OpportunityFilters {
  outcome: FilterOutcome | ''
  status: OpportunityStatus | ''
  sort: 'score' | 'recent'
}

export const DEFAULT_FILTERS: OpportunityFilters = { outcome: '', status: '', sort: 'score' }

export function opportunitiesPath(campaignId: string, filters: OpportunityFilters, skip: number, take = PAGE_SIZE): string {
  const query = new URLSearchParams()
  if (filters.outcome) query.set('outcome', filters.outcome)
  if (filters.status) query.set('status', filters.status)
  query.set('sort', filters.sort)
  query.set('take', String(take))
  query.set('skip', String(skip))
  return `/api/v1/campaigns/${encodeURIComponent(campaignId)}/opportunities?${query}`
}

/** Offset paging shifts when a run writes rows between pages, so the next page can repeat items. */
export function appendUnique<T extends { id: string }>(existing: T[], next: T[]): T[] {
  const seen = new Set(existing.map((i) => i.id))
  return [...existing, ...next.filter((i) => !seen.has(i.id))]
}

/** Row actions offered from the list; anything further along the pipeline is changed on the detail page. */
export function quickActions(status: OpportunityStatus): { label: string; to: OpportunityStatus }[] {
  switch (status) {
    case 'Suggested':
      return [
        { label: 'Approve', to: 'Shortlisted' },
        { label: 'Reject', to: 'Dismissed' },
      ]
    case 'New':
      return [
        { label: 'Shortlist', to: 'Shortlisted' },
        { label: 'Dismiss', to: 'Dismissed' },
      ]
    case 'Shortlisted':
      return [
        { label: 'Remove from shortlist', to: 'New' },
        { label: 'Dismiss', to: 'Dismissed' },
      ]
    case 'Dismissed':
      return [{ label: 'Restore', to: 'New' }]
    default:
      return []
  }
}

/** The local agent applies only to shortlisted supported-platform jobs, on its next apply run. */
export function agentApplyPlatform(o: Pick<OpportunitySummary, 'mode' | 'platform' | 'status'>): 'linkedin' | 'naukri' | 'instahyre' | null {
  if (o.mode !== 'Job' || o.status !== 'Shortlisted') return null
  if (o.platform === 'LinkedIn') return 'linkedin'
  if (o.platform === 'Naukri') return 'naukri'
  if (o.platform === 'Instahyre') return 'instahyre'
  return null
}

/** Only http(s) links from research are rendered as links; anything else is shown as text. */
export function safeHref(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null
  } catch {
    return null
  }
}

/** "meridian-logistics.de/karriere" — a readable link text without the scheme. */
export function displayUrl(url: string): string {
  try {
    const u = new URL(url)
    const path = u.pathname === '/' ? '' : u.pathname
    return `${u.hostname.replace(/^www\./, '')}${path}`.slice(0, 80)
  } catch {
    return url.slice(0, 80)
  }
}

/* ---- List, round 3: search within loaded rows, bulk shortlist/dismiss, export selection ---- */

/** Case-insensitive match on title, organisation and location of the rows already loaded (the API has no search). */
export function searchLoaded<T extends Pick<OpportunitySummary, 'title' | 'organization' | 'location'>>(items: T[], q: string): T[] {
  const needle = q.trim().toLowerCase()
  if (!needle) return items
  return items.filter((o) => [o.title, o.organization, o.location ?? ''].some((v) => v.toLowerCase().includes(needle)))
}

/** Whether one row can move to `to` with the same rules as its own quick actions. */
export function canMoveTo(status: OpportunityStatus, to: OpportunityStatus): boolean {
  return quickActions(status).some((a) => a.to === to)
}

function csvCell(v: string | number | null): string {
  const s = v === null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** CSV of the selected rows, built from what is on screen. */
export function selectionCsv(items: OpportunitySummary[]): string {
  const head = ['Title', 'Organisation', 'Location', 'Fit', 'Coverage %', 'Outcome', 'Status', 'URL']
  const rows = items.map((o) => [o.title, o.organization, o.location, clampPercent(o.score), clampPercent(o.coverage), o.outcome, o.status, o.url])
  return [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\n')
}

/** One clear next step per row (design): approve, review, open the posting, or restore. */
export function primaryAction(o: Pick<OpportunitySummary, 'status' | 'outcome'>): { label: string; to?: OpportunityStatus } {
  if (o.status === 'Suggested') return { label: 'Approve', to: 'Shortlisted' }
  if (o.status === 'Dismissed') return { label: 'Restore', to: 'New' }
  if (o.status === 'Shortlisted') return { label: 'Open posting' }
  if (o.status === 'New' && o.outcome === 'Qualified') return { label: 'Shortlist', to: 'Shortlisted' }
  return { label: 'Review' }
}
