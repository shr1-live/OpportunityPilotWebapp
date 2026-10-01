import { describe, expect, it } from 'vitest'
import type { ApplicationItem } from '../../lib/types'
import { appendUnique, applicationsPath, formatWhen, STATUS_FILTERS, STATUS_LABELS } from './applicationStatus'

const item = (id: string): ApplicationItem => ({
  id,
  platform: 'LinkedIn',
  externalJobId: `job-${id}`,
  jobUrl: `https://www.linkedin.com/jobs/view/${id}`,
  title: 'Backend engineer',
  company: 'Acme',
  location: null,
  status: 'Applied',
  detail: null,
  occurredAt: '2026-10-01T14:05:00Z',
  updatedAt: '2026-10-01T14:05:00Z',
})

describe('status labels', () => {
  it('never lets a dry run read as sent', () => {
    expect(STATUS_LABELS.DryRun.text).toContain('not submitted')
    expect(STATUS_LABELS.DryRun.tone).not.toBe(STATUS_LABELS.Applied.tone)
  })

  it('offers a filter for every status', () => {
    const offered = STATUS_FILTERS.map((f) => f.value).filter(Boolean)
    expect(offered.sort()).toEqual(Object.keys(STATUS_LABELS).sort())
  })
})

describe('applicationsPath', () => {
  it('omits filters that are set to all', () => {
    expect(applicationsPath({ status: '', platform: '' }, 0)).toBe('/api/v1/applications?take=50&skip=0')
  })

  it('includes the chosen filters and the page offset', () => {
    expect(applicationsPath({ status: 'NeedsManual', platform: 'Naukri' }, 100)).toBe(
      '/api/v1/applications?status=NeedsManual&platform=Naukri&take=50&skip=100',
    )
  })
})

describe('appendUnique', () => {
  it('appends the next page without repeating rows that shifted across the page boundary', () => {
    const merged = appendUnique([item('a'), item('b')], [item('b'), item('c')])
    expect(merged.map((i) => i.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('formatWhen', () => {
  const opts = { locale: 'en-GB', timeZone: 'UTC', now: new Date('2026-10-01T18:00:00Z') }

  it('shows day, month and 24-hour time for this year', () => {
    expect(formatWhen('2026-10-01T14:05:00Z', opts)).toBe('1 Oct, 14:05')
  })

  it('adds the year for older entries', () => {
    expect(formatWhen('2025-12-31T09:30:00Z', opts)).toBe('31 Dec 2025, 09:30')
  })

  it('does not invent a date for an unreadable value', () => {
    expect(formatWhen('not a date', opts)).toBe('—')
  })
})
