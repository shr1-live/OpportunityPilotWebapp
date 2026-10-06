import { describe, expect, it } from 'vitest'
import { nextTheme, parseTheme, themeAttribute, themeLabel } from './themeModel'

describe('theme', () => {
  it('reads only light or dark; anything else follows the system', () => {
    expect(parseTheme('dark')).toBe('dark')
    expect(parseTheme('light')).toBe('light')
    expect(parseTheme(null)).toBe('system')
    expect(parseTheme('purple')).toBe('system')
  })

  it('cycles System → Light → Dark → System', () => {
    expect(nextTheme('system')).toBe('light')
    expect(nextTheme('light')).toBe('dark')
    expect(nextTheme('dark')).toBe('system')
  })

  it('removes the attribute for System so the OS preference wins', () => {
    expect(themeAttribute('system')).toBeNull()
    expect(themeAttribute('dark')).toBe('dark')
    expect(themeLabel('system')).toBe('System')
  })
})
