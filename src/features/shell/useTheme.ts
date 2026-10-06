import { useCallback, useEffect, useState } from 'react'
import { parseTheme, THEME_EVENT, THEME_KEY, themeAttribute, type ThemeChoice } from './themeModel'

function readStored(): ThemeChoice {
  try {
    return parseTheme(localStorage.getItem(THEME_KEY))
  } catch {
    return 'system'
  }
}

/** Current theme choice, shared by every caller (top bar and Settings) through a window event. */
export function useTheme(): [ThemeChoice, (choice: ThemeChoice) => void] {
  const [choice, setChoice] = useState<ThemeChoice>(readStored)

  useEffect(() => {
    const sync = () => setChoice(readStored())
    window.addEventListener(THEME_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(THEME_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const set = useCallback((next: ThemeChoice) => {
    try {
      if (next === 'system') localStorage.removeItem(THEME_KEY)
      else localStorage.setItem(THEME_KEY, next)
    } catch {
      // Storage blocked: the choice still applies to this page view.
    }
    const attr = themeAttribute(next)
    if (attr) document.documentElement.dataset.theme = attr
    else delete document.documentElement.dataset.theme
    setChoice(next)
    window.dispatchEvent(new Event(THEME_EVENT))
  }, [])

  return [choice, set]
}
