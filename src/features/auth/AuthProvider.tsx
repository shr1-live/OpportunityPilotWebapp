import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { api, configureApiAuth } from '../../lib/api'
import { config, supabaseConfigured } from '../../lib/config'
import { supabase } from '../../lib/supabase'
import { AUTH_PATHS, KEEP_SIGNED_IN_KEY, signUpEmailTaken, writeFlag } from './authModel'

/**
 * supabase: real accounts (email + password, Google), with "Continue as guest" next to them when the API allows it.
 * dev: local development only. guest: demo mode — no accounts configured, the API issues random signed guest identities.
 */
export type AuthMode = 'supabase' | 'dev' | 'guest'

export type SignUpResult = 'signed-in' | 'verify-email' | 'email-taken'

interface AuthState {
  mode: AuthMode
  ready: boolean
  user: { id?: string; email: string; guest: boolean } | null
  sessionExpired: boolean
  /** The visitor opened a password-reset link: they are signed in only to choose a new password. */
  recovering: boolean
  signOut: () => Promise<void>
  devSignIn: (name: string) => void
  guestSignIn: () => Promise<void>
  /** Supabase only. Each throws an Error with Supabase's message on failure. */
  passwordSignIn: (email: string, password: string, keepSignedIn: boolean) => Promise<void>
  googleSignIn: () => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<SignUpResult>
  resendVerification: (email: string) => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  setNewPassword: (password: string, signOutOthers: boolean) => Promise<void>
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

function requireSupabase() {
  if (!supabase) throw new Error('Accounts are not switched on for this deployment yet. Continue as guest instead.')
  return supabase
}

function origin() {
  return typeof window === 'undefined' ? '' : window.location.origin
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const mode: AuthMode = supabaseConfigured ? 'supabase' : config.devAuth ? 'dev' : 'guest'
  const [session, setSession] = useState<Session | null>(null)
  const [devUser, setDevUser] = useState<string | null>(mode === 'dev' ? read(DEV_USER_KEY) : null)
  const [guestToken, setGuestToken] = useState<string | null>(mode === 'dev' ? null : read(GUEST_TOKEN_KEY))
  const [ready, setReady] = useState(mode !== 'supabase')
  const [sessionExpired, setSessionExpired] = useState(false)
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthState>(() => {
    const signOut = async () => {
      if (supabase) await supabase.auth.signOut()
      write(DEV_USER_KEY, null)
      write(GUEST_TOKEN_KEY, null)
      setDevUser(null)
      setGuestToken(null)
      setRecovering(false)
    }

    configureApiAuth(
      async (): Promise<Record<string, string>> => {
        if (supabase) {
          const { data } = await supabase.auth.getSession()
          if (data.session) return { Authorization: `Bearer ${data.session.access_token}` }
        }
        if (mode === 'dev' && devUser) return { 'X-Dev-User': devUser }
        if (guestToken) return { Authorization: `Bearer ${guestToken}` }
        return {}
      },
      () => {
        // The API rejected the credentials: drop them and say why on the sign-in screen.
        setSessionExpired(true)
        void signOut()
      },
    )

    const user = session
      ? { id: session.user.id, email: session.user.email ?? 'Signed in', guest: false }
      : mode === 'dev' && devUser
        ? { email: devUser, guest: false }
        : guestToken
          ? { email: 'Guest', guest: true }
          : null

    return {
      mode,
      ready,
      user,
      sessionExpired,
      recovering,
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
      passwordSignIn: async (email, password, keepSignedIn) => {
        writeFlag(KEEP_SIGNED_IN_KEY, keepSignedIn)
        const { error } = await requireSupabase().auth.signInWithPassword({ email, password })
        if (error) throw new Error(error.message)
        setSessionExpired(false)
      },
      googleSignIn: async () => {
        const { error } = await requireSupabase().auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: origin() },
        })
        if (error) throw new Error(error.message)
      },
      signUp: async (name, email, password) => {
        const { data, error } = await requireSupabase().auth.signUp({
          email,
          password,
          options: { data: { full_name: name }, emailRedirectTo: origin() },
        })
        if (error) throw new Error(error.message)
        if (signUpEmailTaken(data.user)) return 'email-taken'
        return data.session ? 'signed-in' : 'verify-email'
      },
      resendVerification: async (email) => {
        const { error } = await requireSupabase().auth.resend({
          type: 'signup',
          email,
          options: { emailRedirectTo: origin() },
        })
        if (error) throw new Error(error.message)
      },
      requestPasswordReset: async (email) => {
        const { error } = await requireSupabase().auth.resetPasswordForEmail(email, {
          redirectTo: origin() + AUTH_PATHS['new-password'],
        })
        // Same confirmation whether or not the account exists: only surface errors that are not about the address.
        if (error && error.status !== 400 && error.status !== 404) throw new Error(error.message)
      },
      setNewPassword: async (password, signOutOthers) => {
        const client = requireSupabase()
        const { error } = await client.auth.updateUser({ password })
        if (error) throw new Error(error.message)
        if (signOutOthers) await client.auth.signOut({ scope: 'others' })
        setRecovering(false)
      },
    }
  }, [mode, ready, session, devUser, guestToken, sessionExpired, recovering])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
