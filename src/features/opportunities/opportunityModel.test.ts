import { describe, expect, it } from 'vitest'
import {
  agentApplyPlatform,
  appendUnique,
  DEFAULT_FILTERS,
  factLabel,
  formatCoverage,
  formatPoints,
  formatScore,
  opportunitiesPath,
  quickActions,
  safeHref,
  valueLabel,
} from './opportunityModel'

describe('valueLabel', () => {
  it('keeps unknown distinct from not met', () => {
    expect(valueLabel(null).text).toBe('Unknown')
    expect(valueLabel(0).text).toBe('Not met')
    expect(valueLabel(null).tone).not.toBe(valueLabel(0).tone)
  })

  it('maps full and partial matches', () => {
    expect(valueLabel(1).text).toBe('Met')
    expect(valueLabel(0.5).text).toBe('Partly')
  })
})

describe('score formatting', () => {
  it('reads as a rank out of 100, never a likelihood', () => {
    expect(formatScore(82)).toBe('82/100')
    expect(formatScore(82)).not.toContain('%')
  })

  it('rounds and bounds what the server sends', () => {
    expect(formatScore(104.6)).toBe('100/100')
    expect(formatCoverage(87.5)).toBe('coverage 88%')
    expect(formatCoverage(Number.NaN)).toBe('coverage 0%')
    expect(formatPoints(31.6, 35)).toBe('32 / 35')
  })
})

describe('factLabel', () => {
  it('only calls a fact verified when it has evidence and is not an inference', () => {
    expect(factLabel({ evidenceId: 'e1', isInference: false }).text).toBe('Verified')
    expect(factLabel({ evidenceId: 'e1', isInference: true }).text).toBe('Inferred')
    expect(factLabel({ evidenceId: null, isInference: false }).text).toBe('Not verified')
  })
})

describe('opportunitiesPath', () => {
  it('sends only the filters that are set', () => {
    expect(opportunitiesPath('c1', DEFAULT_FILTERS, 0)).toBe('/api/v1/campaigns/c1/opportunities?sort=score&take=50&skip=0')
    expect(opportunitiesPath('c1', { outcome: 'NeedsVerification', status: 'New', sort: 'recent' }, 50)).toBe(
      '/api/v1/campaigns/c1/opportunities?outcome=NeedsVerification&status=New&sort=recent&take=50&skip=50',
    )
  })

  it('appends the next page without repeating shifted rows', () => {
    expect(appendUnique([{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'c' }]).map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('quickActions', () => {
  it('lets a shortlisted row be undone and a dismissed one restored', () => {
    expect(quickActions('Shortlisted').map((a) => a.to)).toEqual(['New', 'Dismissed'])
    expect(quickActions('Dismissed').map((a) => a.to)).toEqual(['New'])
  })

  it('offers no list shortcut that could overwrite later pipeline states', () => {
    expect(quickActions('Applied')).toEqual([])
    expect(quickActions('Contacted')).toEqual([])
  })
})

describe('agentApplyPlatform', () => {
  it('names the platform for shortlisted LinkedIn and Naukri jobs only', () => {
    expect(agentApplyPlatform({ mode: 'Job', platform: 'Naukri', status: 'Shortlisted' })).toBe('naukri')
    expect(agentApplyPlatform({ mode: 'Job', platform: 'Other', status: 'Shortlisted' })).toBeNull()
    expect(agentApplyPlatform({ mode: 'Job', platform: 'LinkedIn', status: 'New' })).toBeNull()
    expect(agentApplyPlatform({ mode: 'Customer', platform: 'LinkedIn', status: 'Shortlisted' })).toBeNull()
  })
})

describe('safeHref', () => {
  it('links only http and https URLs', () => {
    expect(safeHref('https://example.com/jobs/1')).toBe('https://example.com/jobs/1')
    expect(safeHref('javascript:alert(1)')).toBeNull()
    expect(safeHref('not a url')).toBeNull()
    expect(safeHref(null)).toBeNull()
  })
})
