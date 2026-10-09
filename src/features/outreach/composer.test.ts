import { describe, expect, it } from 'vitest'
import { composerTarget, unresolvedPlaceholder } from './composer'

describe('composerTarget', () => {
  it('pre-fills an email in the mail app', () => {
    const t = composerTarget('Email', { recipient: 'a@b.co', subject: 'Hello there', body: 'Hi A' })
    expect(t.kind).toBe('mailto')
    expect(t.url).toBe('mailto:a%40b.co?subject=Hello%20there&body=Hi%20A')
    expect(t.copy).toBe(false)
  })
  it('falls back to copy for a very long email body', () => {
    const t = composerTarget('Email', { recipient: 'a@b.co', subject: '', body: 'x'.repeat(3000) })
    expect(t.copy).toBe(true)
    expect(t.url).toBe('mailto:a%40b.co')
  })
  it('opens LinkedIn Messages with the text copied, or a LinkedIn profile link when given', () => {
    expect(composerTarget('LinkedInMessage', { recipient: '', subject: '', body: 'Hi' })).toMatchObject({ kind: 'site', url: 'https://www.linkedin.com/messaging/', copy: true })
    expect(composerTarget('LinkedInMessage', { recipient: 'https://www.linkedin.com/in/x', subject: '', body: 'Hi' }).url).toBe('https://www.linkedin.com/in/x')
  })
  it('never opens a non-https recipient as a site', () => {
    expect(composerTarget('ContactForm', { recipient: 'javascript:alert(1)', subject: '', body: 'Hi' }).url).toBeNull()
  })
})

describe('unresolvedPlaceholder', () => {
  it('finds a bracketed placeholder and ignores plain text', () => {
    expect(unresolvedPlaceholder('Regards, [Your name]')).toBe('[Your name]')
    expect(unresolvedPlaceholder('all good', 'also fine')).toBeNull()
    expect(unresolvedPlaceholder('[]')).toBeNull()
  })
})
