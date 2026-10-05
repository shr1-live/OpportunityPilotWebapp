import { useState, type FormEvent } from 'react'
import { ErrorNotice } from '../../components/ErrorNotice'
import { ApiError, ApiStillUnreachableError, ApiUnreachableError } from '../../lib/api'
import { isWakingError, wakeRetryDelay } from '../../lib/wakeRetry'
import { supabase } from '../../lib/supabase'
import { useAuth } from './AuthProvider'

export function SignInPage() {
  const { mode, sessionExpired, devSignIn, guestSignIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null)

  const [guestError, setGuestError] = useState<Error>()
  const [waking, setWaking] = useState(false)

  async function continueAsGuest() {
    setBusy(true)
    setGuestError(undefined)
    try {
      // The free host may be asleep: keep trying while it wakes instead of failing on the first attempt.
      for (let attempt = 0; ; attempt++) {
        try {
          await guestSignIn()
          break
        } catch (e) {
          const delay = isWakingError(e) ? wakeRetryDelay(attempt) : null
          if (delay === null) throw e instanceof ApiUnreachableError && attempt > 0 ? new ApiStillUnreachableError(e.message) : e
          setWaking(true)
          await new Promise((r) => setTimeout(r, delay))
        }
      }
    } catch (e) {
      setGuestError(
        e instanceof ApiError && e.status === 404
          ? new Error('Guest sign-in is switched off on this server because real sign-in is configured. Set the web app’s Supabase values and redeploy.')
          : (e as Error),
      )
    } finally {
      setBusy(false)
      setWaking(false)
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setMessage(null)
    if (mode === 'dev') {
      if (email.trim()) devSignIn(email.trim())
      return
    }
    if (!supabase) return
    setBusy(true)
    const { data, error } = creating
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setMessage({ kind: 'error', text: error.message })
    else if (creating && !data.session)
      setMessage({ kind: 'info', text: 'Check your inbox to confirm the address, then sign in.' })
  }

  return (
    <main className="signin">
      <div className="signin-card">
        <div className="signin-brand">OpportunityPilot</div>
        <h1 className="signin-title">{mode === 'guest' ? 'Try it as a guest' : creating ? 'Create your account' : 'Sign in'}</h1>

        {sessionExpired && (
          <p className="notice notice-warning" role="status">
            {mode === 'guest'
              ? 'Your guest session ended — the demo server restarted, which also clears its temporary data.'
              : 'Your session expired. Sign in again to continue.'}
          </p>
        )}

        {mode === 'guest' ? (
          <div className="stack-3">
            <p className="notice notice-neutral">
              <strong>Demo mode.</strong> Accounts are not set up yet, so you get a private guest space in this browser.
              Other visitors cannot see it. Data is temporary: it is cleared when the server restarts, which on free
              hosting happens after a few idle minutes.
            </p>
            {guestError && <ErrorNotice error={guestError} />}
            <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void continueAsGuest()}>
              {busy ? (waking ? 'Waking the server… this can take a minute' : 'Starting…') : 'Continue as guest'}
            </button>
            <p className="hint">The first visit can take up to a minute while the server wakes up.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="stack-3">
            {mode === 'dev' && (
              <p className="notice notice-neutral">
                <strong>Development sign-in.</strong> Local only — any name creates a separate synthetic user. This
                option does not exist in production builds.
              </p>
            )}
            <div className="field">
              <label htmlFor="email">{mode === 'dev' ? 'Dev user name or email' : 'Email'}</label>
              <input
                id="email"
                type={mode === 'dev' ? 'text' : 'email'}
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {mode === 'supabase' && (
              <div className="field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  autoComplete={creating ? 'new-password' : 'current-password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}
            {message && (
              <p className={`notice ${message.kind === 'error' ? 'notice-danger' : 'notice-neutral'}`} role="alert">
                {message.text}
              </p>
            )}
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Working…' : creating ? 'Create account' : 'Sign in'}
            </button>
            {mode === 'supabase' && (
              <button type="button" className="btn-link" onClick={() => setCreating((c) => !c)}>
                {creating ? 'I already have an account' : 'Create an account'}
              </button>
            )}
          </form>
        )}
      </div>
    </main>
  )
}
