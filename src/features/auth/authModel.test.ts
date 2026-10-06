import { describe, expect, it } from 'vitest'
import {
  authScreenFor,
  formatCountdown,
  isAuthOnlyPath,
  passwordStrength,
  resendSecondsLeft,
  signUpEmailTaken,
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

  it('spots the existing-account answer from Supabase', () => {
    expect(signUpEmailTaken({ identities: [] })).toBe(true)
    expect(signUpEmailTaken({ identities: [{}] })).toBe(false)
    expect(signUpEmailTaken(null)).toBe(false)
  })

  it('counts down the resend cooldown', () => {
    expect(resendSecondsLeft(0, 18_000)).toBe(42)
    expect(resendSecondsLeft(0, 90_000)).toBe(0)
    expect(formatCountdown(42)).toBe('0:42')
    expect(formatCountdown(75)).toBe('1:15')
  })
})
