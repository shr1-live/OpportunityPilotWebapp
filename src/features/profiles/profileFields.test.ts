import { describe, expect, it } from 'vitest'
import { buildSummary, confirmationState, createFields, FIELDS as ALL_FIELDS, isFullyConfirmed, isWideField, joinTags, splitTags } from './profileFields'

describe('profile confirmation', () => {
  it('is not confirmed when no claims are filled in', () => {
    expect(isFullyConfirmed('Candidate', { fields: { offer: '.NET work' }, confirmations: {} })).toBe(false)
  })

  it('requires every filled claim to be confirmed', () => {
    const data = { fields: { experience: '4 years .NET', skills: 'C#, React' }, confirmations: { experience: true } }
    expect(isFullyConfirmed('Candidate', data)).toBe(false)
    expect(confirmationState('Candidate', data).awaiting).toEqual(['Skills'])

    data.confirmations = { experience: true, skills: true } as never
    expect(isFullyConfirmed('Candidate', data)).toBe(true)
  })

  it('ignores stale confirmations on empty fields', () => {
    const data = { fields: { experience: '4 years .NET', skills: '' }, confirmations: { experience: true, skills: true } }
    expect(isFullyConfirmed('Candidate', data)).toBe(true)
    expect(confirmationState('Candidate', data).missing).toEqual(['Skills'])
  })
})

describe('summary', () => {
  it('uses only what the user typed, in field order, without rewording', () => {
    const summary = buildSummary('Candidate', {
      fields: { skills: 'C#', offer: 'Backend work', availability: 'Rate: [YOUR RATE]' },
      confirmations: {},
    })
    expect(summary).toBe('What you offer: Backend work\nSkills: C#\nAvailability and terms: Rate: [YOUR RATE]')
  })
})


describe('round-3 profile editor', () => {
  it('round-trips skills between text and chips', () => {
    expect(splitTags('C#, .NET 8,\nDocker , ')).toEqual(['C#', '.NET 8', 'Docker'])
    expect(joinTags(['C#', 'Docker'])).toBe('C#, Docker')
    expect(splitTags(undefined)).toEqual([])
  })

  it('creates with the offer and non-claim fields only; claims come after saving', () => {
    expect(createFields('Candidate').map((f) => f.key)).toEqual(['offer', 'availability'])
    expect(createFields('Candidate').some((f) => f.confirmable)).toBe(false)
  })

  it('makes the offer full width', () => {
    expect(isWideField(ALL_FIELDS.Candidate[0])).toBe(true)
  })
})
