import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from './AuthProvider'

export function SignInPage() {
  const { mode, sessionExpired, devSignIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null)

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
        <h1 className="signin-title">{creating ? 'Create your account' : 'Sign in'}</h1>

        {sessionExpired && (
          <p className="notice notice-warning" role="status">
            Your session expired. Sign in again to continue.
          </p>
        )}

        {mode === 'unconfigured' ? (
          <div className="notice notice-warning" role="alert">
            <strong>Sign-in setup required.</strong> Set <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>, or for local development only set{' '}
            <code>VITE_DEV_AUTH=true</code>. See the README.
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
