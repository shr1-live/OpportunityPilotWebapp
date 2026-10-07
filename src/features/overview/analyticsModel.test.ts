import { describe, expect, it } from 'vitest'
import { analyticsPath, funnelRows, histogramHeights, isFirstRun, percent, shareWidths } from './analyticsModel'

describe('overview analytics', () => {
  it('asks for the workspace the user is in', () => {
    expect(analyticsPath('candidate')).toBe('/api/v1/analytics/overview?workspace=Candidate&days=30')
    expect(analyticsPath('sales', 7)).toBe('/api/v1/analytics/overview?workspace=Sales&days=7')
  })

  it('treats an account with no profile and no campaign as a first run', () => {
    const base = { profiles: 0, campaigns: 0, applied: 0, needsManual: 0, shortlisted: 0, awaitingApproval: 0, draftsAwaitingReview: 0, followUpsDue: 0 }
    expect(isFirstRun(base)).toBe(true)
    expect(isFirstRun({ ...base, profiles: 1 })).toBe(false)
    expect(isFirstRun(undefined)).toBe(false)
  })

  it('formats rates and never invents one', () => {
    expect(percent(0.2571)).toBe('26%')
    expect(percent(null)).toBe('—')
  })

  it('computes funnel widths and share of the previous step; unknown stays unknown', () => {
    const rows = funnelRows([
      { key: 'read', label: 'Read', count: 200, note: '' },
      { key: 'found', label: 'Found', count: 50, note: '' },
      { key: 'contacted', label: 'Contacted', count: null, note: 'Not tracked' },
    ])
    expect(rows.map((r) => r.width)).toEqual([100, 25, 0])
    expect(rows[0].ofPrevious).toBeNull()
    expect(rows[1].ofPrevious).toBe('25% of previous')
    expect(rows[2].ofPrevious).toBeNull()
  })

  it('scales histogram bars and share bars to the largest value, and handles all-zero', () => {
    expect(histogramHeights([{ from: 0, to: 9, count: 2 }, { from: 10, to: 19, count: 4 }])).toEqual([50, 100])
    expect(histogramHeights([{ from: 0, to: 9, count: 0 }])).toEqual([0])
    expect(shareWidths([3, 6, 0])).toEqual([50, 100, 0])
  })
})
