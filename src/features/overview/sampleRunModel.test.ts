import { describe, expect, it } from 'vitest'
import { SAMPLE_SOURCES, SAMPLE_SUGGEST_AT, sampleCampaign, sampleProfile } from './sampleRunModel'

describe('sample run', () => {
  it('uses two public, keyless job boards', () => {
    expect(SAMPLE_SOURCES.map((s) => `${s.kind}:${s.url}`)).toEqual(['Greenhouse:stripe', 'Lever:leverdemo'])
  })

  it('builds a confirmed candidate profile', () => {
    const p = sampleProfile()
    expect(p.type).toBe('Candidate')
    expect(p.confirmed).toBe(true)
  })

  it('builds a job campaign for the given profile that suggests at the threshold', () => {
    const c = sampleCampaign('p-1')
    expect(c.profileId).toBe('p-1')
    expect(c.mode).toBe('Job')
    expect(c.autoSuggestMinScore).toBe(SAMPLE_SUGGEST_AT)
    expect(c.criteria.keywords.length).toBeGreaterThan(0)
  })
})
