import { describe, expect, it } from 'vitest'
import { PIPELINE_STEPS, SOURCE_CHECKS } from './guideModel'

describe('how it works guide', () => {
  it('covers the pipeline from profile to tracking, in order', () => {
    expect(PIPELINE_STEPS[0].title).toBe('Profile')
    expect(PIPELINE_STEPS.at(-1)?.title).toBe('Track')
  })
  it('links only to routes that exist', () => {
    const routes = ['/', '/profiles', '/campaigns', '/opportunities', '/approvals', '/applications']
    for (const s of PIPELINE_STEPS) if (s.link) expect(routes).toContain(s.link.to)
  })
  it('explains how to check every source kind the API reads', () => {
    expect(SOURCE_CHECKS.map((s) => s.source.split(' ')[0])).toEqual(['Greenhouse', 'Lever', 'Adzuna', 'Pasted', 'Public', 'Local'])
  })
})
