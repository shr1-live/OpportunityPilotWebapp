export type JobBoard = 'Indeed' | 'LinkedIn' | 'Seek'

export type BoardJob = {
  providerJobId: string
  title: string
  companyName: string
  companyLogoUrl: string | null
  boardUrl: string
  location: string | null
  isRemote: boolean
  employmentType: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string | null
  salaryPeriod: string | null
  postedAt: string | null
  snippet: string | null
}

export type BoardSearchResult = {
  board: JobBoard
  status: 'Ready' | 'NotConfigured' | 'Failed'
  jobs: BoardJob[]
  providerResults: number
  message: string | null
  observedAt: string | null
  fromCache: boolean
  source: string
}

export type BoardSearch = { query: string; location: string; workMode: string; postedWithinDays: string; country: string }

type BoardInfo = {
  name: string
  /** Opens the same search on the board itself. */
  searchUrl: (s: BoardSearch) => string
  /** What the board's own API allows, in one sentence. */
  boundary: string
  countries?: { value: string; label: string }[]
}

export const BOARDS: Record<JobBoard, BoardInfo> = {
  Indeed: {
    name: 'Indeed',
    searchUrl: (s) => {
      const p = new URLSearchParams()
      if (s.query) p.set('q', s.query)
      if (s.location.trim()) p.set('l', s.location.trim())
      if (s.postedWithinDays) p.set('fromage', s.postedWithinDays)
      return `https://www.indeed.com/jobs?${p}`
    },
    boundary: 'Indeed closed its public job-search API, and its pages block automated reading.',
  },
  LinkedIn: {
    name: 'LinkedIn',
    searchUrl: (s) => {
      const p = new URLSearchParams()
      if (s.query) p.set('keywords', s.query)
      if (s.location.trim()) p.set('location', s.location.trim())
      if (s.postedWithinDays) p.set('f_TPR', `r${Number(s.postedWithinDays) * 86400}`)
      if (s.workMode === 'remote') p.set('f_WT', '2')
      return `https://www.linkedin.com/jobs/search/?${p}`
    },
    boundary: 'LinkedIn job and feed APIs are for approved partners only; your feed and profile are never read.',
  },
  Seek: {
    name: 'SEEK',
    searchUrl: (s) => {
      const p = new URLSearchParams()
      if (s.query) p.set('keywords', s.query)
      if (s.location.trim()) p.set('where', s.location.trim())
      if (s.postedWithinDays) p.set('daterange', s.postedWithinDays)
      return `https://www.seek.${s.country === 'nz' ? 'co.nz' : 'com.au'}/jobs?${p}`
    },
    boundary: 'SEEK APIs are for approved recruitment-software partners; SEEK runs in Australia and New Zealand.',
    countries: [{ value: 'au', label: 'Australia' }, { value: 'nz', label: 'New Zealand' }],
  },
}

/** "FULLTIME" → "Full time"; unknown values are shown as given. */
export function employmentLabel(type: string | null): string | null {
  if (!type) return null
  const known: Record<string, string> = { FULLTIME: 'Full time', PARTTIME: 'Part time', CONTRACTOR: 'Contract', INTERN: 'Internship', TEMPORARY: 'Temporary', PERDIEM: 'Per diem' }
  return known[type.toUpperCase()] ?? type
}

/** Indeed-style "posted within days" choices mapped to the aggregator's date_posted values. */
export function datePostedFor(postedWithinDays: string): string {
  switch (postedWithinDays) {
    case '1': return 'today'
    case '3': return '3days'
    case '7': return 'week'
    case '14': return 'month'
    default: return 'all'
  }
}

/** API path for live postings on one board, or null when there is nothing to search for. */
export function boardJobsPath(board: JobBoard, s: BoardSearch): string | null {
  const q = s.query.trim()
  if (!q) return null
  const params = new URLSearchParams({ board, query: q.slice(0, 200), datePosted: datePostedFor(s.postedWithinDays) })
  if (s.location.trim()) params.set('location', s.location.trim().slice(0, 100))
  if (s.workMode === 'remote') params.set('remoteOnly', 'true')
  if (board === 'Seek' && s.country) params.set('country', s.country)
  return `/api/v1/jobboards/jobs?${params}`
}

/** "USD 90K–120K / year", or null when the posting gives no pay. Never guesses a missing bound. */
export function formatSalary(job: Pick<BoardJob, 'salaryMin' | 'salaryMax' | 'salaryCurrency' | 'salaryPeriod'>): string | null {
  const k = (n: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
  const { salaryMin: min, salaryMax: max } = job
  if (min == null && max == null) return null
  const range = min != null && max != null && min !== max ? `${k(min)}–${k(max)}` : k((min ?? max)!)
  const period = job.salaryPeriod ? ` / ${job.salaryPeriod.toLowerCase()}` : ''
  return `${job.salaryCurrency ? `${job.salaryCurrency} ` : ''}${range}${period}`
}
