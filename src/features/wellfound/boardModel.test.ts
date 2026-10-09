import { describe, expect, it } from 'vitest'
import { BOARDS, campaignFromSearchPath, boardJobsPath, datePostedFor, employmentLabel, formatSalary, type BoardSearch } from './boardModel'

const base: BoardSearch = { query: 'react developer', location: 'Bengaluru', workMode: 'remote', postedWithinDays: '7', country: '' }
const params = (path: string) => new URL(path, 'http://x').searchParams

describe('boardJobsPath', () => {
  it('needs a query', () => expect(boardJobsPath('Indeed', { ...base, query: '  ' })).toBeNull())
  it('maps filters to the API', () => {
    const p = params(boardJobsPath('LinkedIn', base)!)
    expect(p.get('board')).toBe('LinkedIn')
    expect(p.get('query')).toBe('react developer')
    expect(p.get('location')).toBe('Bengaluru')
    expect(p.get('remoteOnly')).toBe('true')
    expect(p.get('datePosted')).toBe('week')
    expect(p.get('country')).toBeNull()
  })
  it('sends the country only for SEEK', () => {
    expect(params(boardJobsPath('Seek', { ...base, country: 'nz' })!).get('country')).toBe('nz')
    expect(params(boardJobsPath('Indeed', { ...base, country: 'nz' })!).get('country')).toBeNull()
  })
  it('sends the optional provider filters and ignores a radius without a location', () => {
    const p = params(boardJobsPath('Indeed', { ...base, employmentType: 'FULLTIME,CONTRACTOR', experience: 'under_3_years_experience', radiusKm: '25' })!)
    expect(p.get('employmentType')).toBe('FULLTIME,CONTRACTOR')
    expect(p.get('experience')).toBe('under_3_years_experience')
    expect(p.get('radiusKm')).toBe('25')
    expect(params(boardJobsPath('Indeed', { ...base, location: '', radiusKm: '25' })!).get('radiusKm')).toBeNull()
    expect(params(boardJobsPath('Indeed', base)!).get('employmentType')).toBeNull()
  })
  it('leaves remote off for other modes', () => expect(boardJobsPath('Indeed', { ...base, workMode: 'hybrid' })).not.toContain('remoteOnly'))
})

describe('board search links', () => {
  it('builds each board search on its own site', () => {
    expect(BOARDS.Indeed.searchUrl(base)).toBe('https://www.indeed.com/jobs?q=react+developer&l=Bengaluru&fromage=7')
    expect(BOARDS.LinkedIn.searchUrl(base)).toBe('https://www.linkedin.com/jobs/search/?keywords=react+developer&location=Bengaluru&f_TPR=r604800&f_WT=2')
    expect(BOARDS.Seek.searchUrl({ ...base, country: 'nz' })).toMatch(/^https:\/\/www\.seek\.co\.nz\/jobs\?/)
    expect(BOARDS.Seek.searchUrl(base)).toMatch(/^https:\/\/www\.seek\.com\.au\/jobs\?/)
  })
})

describe('datePostedFor', () => {
  it('maps days', () => expect(['1', '3', '7', '14', ''].map(datePostedFor)).toEqual(['today', '3days', 'week', 'month', 'all']))
})

describe('employmentLabel', () => {
  it('reads codes as words', () => expect(['FULLTIME', 'CONTRACTOR', 'Seasonal'].map(employmentLabel)).toEqual(['Full time', 'Contract', 'Seasonal']))
  it('is null when missing', () => expect(employmentLabel(null)).toBeNull())
})

describe('formatSalary', () => {
  const none = { salaryMin: null, salaryMax: null, salaryCurrency: null, salaryPeriod: null }
  it('is null without pay', () => expect(formatSalary(none)).toBeNull())
  it('formats a range', () => expect(formatSalary({ salaryMin: 90000, salaryMax: 120000, salaryCurrency: 'USD', salaryPeriod: 'YEAR' })).toBe('USD 90K–120K / year'))
  it('uses compact large numbers', () => expect(formatSalary({ salaryMin: 1800000, salaryMax: 2600000, salaryCurrency: 'INR', salaryPeriod: 'YEAR' })).toBe('INR 1.8M–2.6M / year'))
  it('shows a single bound as given', () => expect(formatSalary({ ...none, salaryMax: 45 })).toBe('45'))
})

describe('campaignFromSearchPath', () => {
  it('starts a Job campaign for candidates and a Customer campaign for sales', () => {
    expect(campaignFromSearchPath('candidate', { query: '.NET developer', location: 'Pune' }, 'Indeed', 'Indeed')).toContain('mode=Job')
    const sales = campaignFromSearchPath('sales', { query: 'react', location: '' }, 'LinkedIn', 'LinkedIn')
    expect(sales).toContain('mode=Customer')
    expect(sales).not.toContain('location=')
  })
})
