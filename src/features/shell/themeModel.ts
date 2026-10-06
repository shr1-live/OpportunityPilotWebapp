/**
 * Light / dark theme choice. "system" means no data-theme attribute, so tokens.css follows
 * prefers-color-scheme. The same key is read by the inline boot script in index.html (no white flash).
 */
export type ThemeChoice = 'system' | 'light' | 'dark'

export const THEME_KEY = 'op-theme'
export const THEME_EVENT = 'op-theme-change'
export const THEME_CHOICES: readonly ThemeChoice[] = ['system', 'light', 'dark']

export function parseTheme(value: string | null | undefined): ThemeChoice {
  return value === 'light' || value === 'dark' ? value : 'system'
}

/** Top-bar button order: System → Light → Dark → System. */
export function nextTheme(current: ThemeChoice): ThemeChoice {
  return THEME_CHOICES[(THEME_CHOICES.indexOf(current) + 1) % THEME_CHOICES.length]
}

export function themeLabel(choice: ThemeChoice): string {
  return choice === 'system' ? 'System' : choice === 'light' ? 'Light' : 'Dark'
}

/** The value for <html data-theme>, or null to remove it. */
export function themeAttribute(choice: ThemeChoice): 'light' | 'dark' | null {
  return choice === 'system' ? null : choice
}
