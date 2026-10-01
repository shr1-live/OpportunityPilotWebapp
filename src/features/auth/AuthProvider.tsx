import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { configureApiAuth } from '../../lib/api'
import { config, supabaseConfigured } from '../../lib/config'
import { supabase } from '../../lib/supabase'

export type AuthMode = 'supabase' | 'dev' | 'unconfigured'

interface AuthState {
  mode: AuthMode
  ready: boolean
  user: { id?: string; email: string } | null
  sessionExpired: boolean
  signOut: () => Promise<void>
  devSignIn: (name: string) => void
}

const AuthContext = createContext<AuthState | null>(null)
const DEV_USER_KEY = 'op.devUser'

function readDevUser(): string | null {
  try {
    return localStorage.getItem(DEV_USER_KEY)
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const mode: AuthMode = supabaseConfigured ? 'supabase' : config.devAuth ? 'dev' : 'unconfigured'
  const [session, setSession] = useState<Session | null>(null)
  const [devUser, setDevUser] = useState<string | null>(mode === 'dev' ? readDevUser() : null)
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
      try {
        localStorage.removeItem(DEV_USER_KEY)
      } catch {
        /* storage unavailable */
      }
      setDevUser(null)
    }

    configureApiAuth(
      async (): Promise<Record<string, string>> => {
        if (mode === 'supabase' && supabase) {
          const { data } = await supabase.auth.getSession()
          return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}
        }
        if (mode === 'dev' && devUser) return { 'X-Dev-User': devUser }
        return {}
      },
      () => {
        // The API rejected the token: drop the session and say why on the sign-in screen.
        setSessionExpired(true)
        void signOut()
      },
    )

    const user =
      mode === 'supabase' && session
        ? { id: session.user.id, email: session.user.email ?? 'Signed in' }
        : mode === 'dev' && devUser
          ? { email: devUser }
          : null

    return {
      mode,
      ready,
      user,
      sessionExpired,
      signOut,
      devSignIn: (name: string) => {
        try {
          localStorage.setItem(DEV_USER_KEY, name)
        } catch {
          /* storage unavailable; session lasts for this tab only */
        }
        setSessionExpired(false)
        setDevUser(name)
      },
    }
  }, [mode, ready, session, devUser, sessionExpired])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
