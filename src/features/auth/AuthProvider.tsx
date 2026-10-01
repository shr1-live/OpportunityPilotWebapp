import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { api, configureApiAuth } from '../../lib/api'
import { config, supabaseConfigured } from '../../lib/config'
import { supabase } from '../../lib/supabase'

/** guest: demo mode while Supabase is not configured — the API issues a random, signed guest identity. */
export type AuthMode = 'supabase' | 'dev' | 'guest'

interface AuthState {
  mode: AuthMode
  ready: boolean
  user: { id?: string; email: string } | null
  sessionExpired: boolean
  signOut: () => Promise<void>
  devSignIn: (name: string) => void
  guestSignIn: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)
const DEV_USER_KEY = 'op.devUser'
const GUEST_TOKEN_KEY = 'op.guestToken'

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* storage unavailable; the session lasts for this tab only */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const mode: AuthMode = supabaseConfigured ? 'supabase' : config.devAuth ? 'dev' : 'guest'
  const [session, setSession] = useState<Session | null>(null)
  const [devUser, setDevUser] = useState<string | null>(mode === 'dev' ? read(DEV_USER_KEY) : null)
  const [guestToken, setGuestToken] = useState<string | null>(mode === 'guest' ? read(GUEST_TOKEN_KEY) : null)
  const [ready, setReady] = useState(mode !== 'supabase')
  const [sessionExpired, setSessionExpired] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthState>(() => {
    const signOut = async () => {
      if (supabase) await supabase.auth.signOut()
      write(DEV_USER_KEY, null)
      write(GUEST_TOKEN_KEY, null)
      setDevUser(null)
      setGuestToken(null)
    }

    configureApiAuth(
      async (): Promise<Record<string, string>> => {
        if (mode === 'supabase' && supabase) {
          const { data } = await supabase.auth.getSession()
          return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}
        }
        if (mode === 'dev' && devUser) return { 'X-Dev-User': devUser }
        if (mode === 'guest' && guestToken) return { Authorization: `Bearer ${guestToken}` }
        return {}
      },
      () => {
        // The API rejected the credentials: drop them and say why on the sign-in screen.
        setSessionExpired(true)
        void signOut()
      },
    )

    const user =
      mode === 'supabase' && session
        ? { id: session.user.id, email: session.user.email ?? 'Signed in' }
        : mode === 'dev' && devUser
          ? { email: devUser }
          : mode === 'guest' && guestToken
            ? { email: 'Guest' }
            : null

    return {
      mode,
      ready,
      user,
      sessionExpired,
      signOut,
      devSignIn: (name: string) => {
        write(DEV_USER_KEY, name)
        setSessionExpired(false)
        setDevUser(name)
      },
      guestSignIn: async () => {
        const { token } = await api<{ token: string; expiresAt: string }>('/api/v1/auth/guest', { method: 'POST' })
        write(GUEST_TOKEN_KEY, token)
        setSessionExpired(false)
        setGuestToken(token)
      },
    }
  }, [mode, ready, session, devUser, guestToken, sessionExpired])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
