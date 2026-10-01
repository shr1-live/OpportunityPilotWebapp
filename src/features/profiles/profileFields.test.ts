import { describe, expect, it } from 'vitest'
import { buildSummary, confirmationState, isFullyConfirmed } from './profileFields'

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
