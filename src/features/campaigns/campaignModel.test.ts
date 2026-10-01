import { describe, expect, it } from 'vitest'
import {
  addTags,
  applicableCriteria,
  campaignPayload,
  criteriaForMode,
  criteriaSummary,
  DEFAULT_WEIGHTS,
  draftFromCampaign,
  draftProblems,
  emptyCriteria,
  fieldError,
  newDraft,
  normaliseTags,
  normaliseWeights,
  parseTagInput,
  weightsForMode,
} from './campaignModel'

const sum = (r: Record<string, number | null>) => Object.values(r).reduce<number>((s, v) => s + (v ?? 0), 0)

describe('tags', () => {
  it('splits pasted lists on commas and new lines and tidies whitespace', () => {
    expect(parseTagInput(' C# ,  .NET\nAzure   Service Bus,, ')).toEqual(['C#', '.NET', 'Azure Service Bus'])
  })

  it('ignores case-insensitive duplicates, keeping the first spelling', () => {
    const r = addTags(['React'], 'react, TypeScript, typescript')
    expect(r.values).toEqual(['React', 'TypeScript'])
    expect(r.added).toEqual(['TypeScript'])
    expect(r.duplicates).toEqual(['react', 'typescript'])
  })

  it('reports tags that do not fit instead of silently dropping them', () => {
    const r = addTags(['a', 'b'], 'c, d', 3)
    expect(r.values).toEqual(['a', 'b', 'c'])
    expect(r.overflow).toEqual(['d'])
  })

  it('normalises lists coming back from the server', () => {
    expect(normaliseTags(['  Berlin ', 'berlin', '', 'Remote'])).toEqual(['Berlin', 'Remote'])
  })
})

describe('criteriaForMode', () => {
  it('drops the other mode’s fields so they cannot affect a run', () => {
    const c = criteriaForMode('Customer', { ...emptyCriteria(), requiredSkills: ['C#'], industries: ['Logistics'], candidateYears: 5 })
    expect(c.requiredSkills).toEqual([])
    expect(c.candidateYears).toBeNull()
    expect(c.industries).toEqual(['Logistics'])
  })

  it('fills lists missing from an older payload and rejects unknown work modes', () => {
    const c = criteriaForMode('Job', { workModes: ['Remote', 'Moon' as never], keywords: ['Backend engineer'] })
    expect(c.workModes).toEqual(['Remote'])
    expect(c.preferredSkills).toEqual([])
    expect(c.keywords).toEqual(['Backend engineer'])
  })
})

describe('weights', () => {
  it('fills defaults for missing keys and ignores keys from another mode', () => {
    expect(weightsForMode('Job', { experience: 50, industry: 99 })).toEqual({ ...DEFAULT_WEIGHTS.Job, experience: 50 })
  })

  it('leaves out criteria the user configured nothing for', () => {
    const c = { ...emptyCriteria(), requiredSkills: ['C#'], locations: ['Pune'] }
    expect([...applicableCriteria('Job', c)].sort()).toEqual(['location', 'mandatorySkills'])
  })

  it('counts experience as applicable at 0 years, because 0 is a configured value', () => {
    expect(applicableCriteria('Job', { ...emptyCriteria(), candidateYears: 0 }).has('experience')).toBe(true)
  })

  it('always scores the customer contact path', () => {
    expect([...applicableCriteria('Customer', emptyCriteria())]).toEqual(['contactPath'])
  })

  it('redistributes inapplicable weight proportionally and still sums to 100', () => {
    const shares = normaliseWeights(DEFAULT_WEIGHTS.Job, new Set(['mandatorySkills', 'location']))
    expect(shares).toEqual({ mandatorySkills: 67, experience: null, location: 33, preferredSkills: null })
    expect(sum(shares)).toBe(100)
  })

  it('rounds with the largest remainder so thirds add up to 100', () => {
    const shares = normaliseWeights({ a: 1, b: 1, c: 1 }, new Set(['a', 'b', 'c']))
    expect(sum(shares)).toBe(100)
    expect(Object.values(shares).sort()).toEqual([33, 33, 34])
  })

  it('shows zero shares rather than dividing by zero when every weight is 0', () => {
    expect(normaliseWeights({ a: 0, b: 0 }, new Set(['a']))).toEqual({ a: 0, b: null })
  })

  it('clamps out-of-range input before normalising', () => {
    expect(normaliseWeights({ a: 250, b: -5 }, new Set(['a', 'b']))).toEqual({ a: 100, b: 0 })
  })
})

describe('criteriaSummary', () => {
  it('lists only configured criteria, separating hard filters from soft ones', () => {
    const lines = criteriaSummary('Job', { ...emptyCriteria(), requiredSkills: ['C#', '.NET'], candidateYears: 4, workModes: ['Onsite'] })
    expect(lines).toEqual([
      { label: 'Required skills', value: 'C#, .NET', kind: 'hard' },
      { label: 'Work modes', value: 'On-site', kind: 'hard' },
      { label: 'Your experience', value: '4 years', kind: 'soft' },
    ])
  })
})

describe('fieldError', () => {
  it('matches ASP.NET property paths in either casing', () => {
    expect(fieldError({ Name: ['Too long.'], 'Criteria.Keywords': ['Too many.'] }, 'name')).toBe('Too long.')
    expect(fieldError({ 'Criteria.Keywords': ['Too many.'] }, 'keywords')).toBe('Too many.')
    expect(fieldError({ goal: ['x'] }, 'name')).toBeUndefined()
  })
})

describe('campaign draft', () => {
  it('sends only the chosen mode’s criteria and weights, trimmed', () => {
    const draft = { ...newDraft(), name: '  Pune backend  ', criteria: { ...emptyCriteria(), requiredSkills: ['C#'], industries: ['Retail'] } }
    const body = campaignPayload(draft, 'Job')
    expect(body.name).toBe('Pune backend')
    expect(body.criteria.industries).toEqual([])
    expect(body.criteria.requiredSkills).toEqual(['C#'])
    expect(Object.keys(body.weights).sort()).toEqual(['experience', 'location', 'mandatorySkills', 'preferredSkills'])
  })

  it('round-trips a saved campaign without reporting changes', () => {
    const saved = { profileId: 'p', mode: 'Customer' as const, name: 'EU logistics', goal: 'g', criteria: { industries: ['Logistics'] }, weights: DEFAULT_WEIGHTS.Customer, resultLimit: 25 }
    const draft = draftFromCampaign(saved)
    expect(campaignPayload(draft, 'Customer')).toEqual(campaignPayload(draftFromCampaign(saved), 'Customer'))
    expect(campaignPayload(draft, 'Customer').weights).toEqual(DEFAULT_WEIGHTS.Customer)
  })

  it('explains every reason the draft cannot be saved', () => {
    const problems = draftProblems({ ...newDraft(), resultLimit: 0, criteria: { ...emptyCriteria(), candidateYears: -1 } }, '')
    expect(problems).toHaveLength(4)
    expect(draftProblems({ ...newDraft(), name: 'Ok' }, 'p')).toEqual([])
  })
})
