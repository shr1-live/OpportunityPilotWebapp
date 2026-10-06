import { describe, expect, it } from 'vitest'
import {
  activeGuestToken,
  authScreenFor,
  formatCountdown,
  isAuthOnlyPath,
  passwordStrength,
  resendSecondsLeft,
} from './authModel'

describe('account screens', () => {
  it('maps URLs to screens; anything else is sign-in so deep links survive', () => {
    expect(authScreenFor('/signup')).toBe('signup')
    expect(authScreenFor('/verify/')).toBe('verify')
    expect(authScreenFor('/reset')).toBe('reset')
    expect(authScreenFor('/reset/new')).toBe('new-password')
    expect(authScreenFor('/opportunities/42')).toBe('signin')
  })

  it('knows which paths only exist while signed out', () => {
    expect(isAuthOnlyPath('/signup')).toBe(true)
    expect(isAuthOnlyPath('/reset/new')).toBe(true)
    expect(isAuthOnlyPath('/')).toBe(false)
    expect(isAuthOnlyPath('/settings')).toBe(false)
  })

  it('rates passwords by length, then variety', () => {
    expect(passwordStrength('short').label).toBe('Too short')
    expect(passwordStrength('alllowercaseletters').label).toBe('Weak')
    expect(passwordStrength('LowercaseAndUpper').label).toBe('Fair')
    expect(passwordStrength('Abcdefgh1234').label).toBe('Fair')
    expect(passwordStrength('Abcdefgh12345678').label).toBe('Good')
    expect(passwordStrength('Abcdefgh1234!xyz').label).toBe('Strong')
  })

  it('counts down the resend cooldown', () => {
    expect(resendSecondsLeft(0, 18_000)).toBe(42)
    expect(resendSecondsLeft(0, 90_000)).toBe(0)
    expect(formatCountdown(42)).toBe('0:42')
    expect(formatCountdown(75)).toBe('1:15')
  })

  it('accepts only an unexpired server-issued guest session', () => {
    const now = Date.parse('2026-10-06T10:00:00Z')
    expect(activeGuestToken({ token: 'valid', expiresAt: '2026-10-06T10:01:00Z' }, now)).toBe('valid')
    expect(activeGuestToken({ token: 'expired', expiresAt: '2026-10-06T09:59:00Z' }, now)).toBeNull()
    expect(activeGuestToken({ token: 'bad-date', expiresAt: 'not-a-date' }, now)).toBeNull()
    expect(activeGuestToken(null, now)).toBeNull()
  })
})
