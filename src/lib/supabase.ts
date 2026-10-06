import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config, supabaseConfigured } from './config'

const KEEP_SIGNED_IN_KEY = 'op.keepSignedIn'

function authStorageKeys(): string[] {
  if (!config.supabaseUrl) return []
  try {
    const projectRef = new URL(config.supabaseUrl).hostname.split('.')[0]
    const base = `sb-${projectRef}-auth-token`
    return [base, `${base}-code-verifier`]
  } catch {
    return []
  }
}

/**
 * Select where the next Supabase session is persisted and remove any older copy from the other store.
 * This prevents toggling "Keep me signed in" from reviving a stale token left by an earlier sign-in.
 */
export function setSessionPersistence(persistent: boolean): void {
  try {
    for (const key of authStorageKeys()) {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    }
    localStorage.setItem(KEEP_SIGNED_IN_KEY, persistent ? '1' : '0')
  } catch {
    /* storage unavailable: Supabase keeps the session in memory for this page view */
  }
}

/**
 * "Keep me signed in on this device": the session lives in localStorage when on (the default), and in
 * sessionStorage when off, so it ends with the tab. The flag is read on every access.
 */
const sessionStore = {
  pick(): Storage | null {
    try {
      return localStorage.getItem(KEEP_SIGNED_IN_KEY) === '0' ? sessionStorage : localStorage
    } catch {
      return null
    }
  },
  getItem(key: string) {
    try {
      return this.pick()?.getItem(key) ?? null
    } catch {
      return null
    }
  },
  setItem(key: string, value: string) {
    try {
      this.pick()?.setItem(key, value)
    } catch {
      /* storage blocked: the session lasts for this page view */
    }
  },
  removeItem(key: string) {
    try {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    } catch {
      /* nothing stored */
    }
  },
}

/** Auth only. The browser never talks to the database directly; all data goes through the API. */
export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(config.supabaseUrl!, config.supabasePublishableKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: sessionStore },
    })
  : null
