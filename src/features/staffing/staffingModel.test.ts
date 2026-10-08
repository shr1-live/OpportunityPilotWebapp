import { describe, expect, it } from 'vitest'
import { inZone, money, nextStages, percent, submittableFields, zonedToUtc } from './staffingModel'

describe('nextStages', () => {
  it('offers one step forward plus hold, lost and disqualified', () =>
    expect(nextStages('Replied', null)).toEqual(['MeetingScheduled', 'OnHold', 'Lost', 'Disqualified']))
  it('resumes a held deal only to where it was', () => expect(nextStages('OnHold', 'Interviewing')).toEqual(['Interviewing']))
  it('offers nothing for closed deals', () => expect(nextStages('Won', null)).toEqual([]))
})

describe('submittableFields', () => {
  it('is empty without consent', () => expect(submittableFields({ consent: 'Pending', shareableFields: ['Name'] })).toEqual([]))
  it('keeps the allowed fields in display order', () =>
    expect(submittableFields({ consent: 'Granted', shareableFields: ['Rate', 'Name'] })).toEqual(['Name', 'Rate']))
})

describe('formatting', () => {
  it('formats money and rates', () => {
    expect(money(24000, 'USD')).toBe('24,000 USD')
    expect(money(null, 'USD')).toBe('—')
    expect(percent(0.5)).toBe('50%')
    expect(percent(null)).toBe('—')
  })
  it('converts a local time in a zone to UTC', () => {
    expect(zonedToUtc('2026-10-20T15:00', 'Asia/Kolkata')).toBe('2026-10-20T09:30:00.000Z')
    expect(zonedToUtc('bad', 'UTC')).toBeNull()
  })
  it('shows an interview in its own zone', () => expect(inZone('2026-10-20T09:30:00Z', 'Asia/Kolkata')).toContain('15:00 (Asia/Kolkata)'))
})
