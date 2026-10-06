import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthCardHeader, AuthLayout, PasswordField } from './AuthLayout'
import { AUTH_PATHS, MIN_PASSWORD } from './authModel'
import { useAuth } from './AuthProvider'

const STORY = {
  headline: 'Locked out?',
  lead: 'The reset link signs you in once, and only for long enough to set a new password.',
  asideTitle: 'Safety',
  asideItems: ['The link is single-use', 'Other sessions can be ended at the same time'],
}

/** Design AuthReset, step 1: request the link. Same confirmation whether or not the account exists. */
export function ResetPasswordPage() {
  const { mode, requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await requestPasswordReset(email.trim())
      setSent(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout {...STORY}>
      <AuthCardHeader title="Reset your password" subtitle="We will email you a link that expires in 60 minutes." />
      {mode !== 'supabase' ? (
        <p className="notice notice-neutral">Accounts are not switched on for this deployment yet, so there is no password to reset.</p>
      ) : sent ? (
        <p className="notice notice-success" role="status">
          If an account exists for <strong>{email}</strong>, a reset link is on its way. For privacy we show this same
          message either way.
        </p>
      ) : (
        <form onSubmit={submit} className="stack-3">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && (
            <p className="notice notice-danger" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-primary auth-wide" type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
          <p className="hint">For privacy we show the same confirmation whether or not an account exists for that address.</p>
        </form>
      )}
      <footer className="auth-card-foot">
        Remembered it? <Link to={AUTH_PATHS.signin}>Back to sign in</Link>
      </footer>
    </AuthLayout>
  )
}

/** Design AuthReset, step 2: opened from the emailed link (Supabase PASSWORD_RECOVERY). */
export function NewPasswordPage() {
  const { user, setNewPassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [others, setOthers] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`)
    if (password !== confirm) return setError('The two passwords do not match.')
    setBusy(true)
    try {
      await setNewPassword(password, others)
      navigate('/', { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout {...STORY}>
      <AuthCardHeader
        title="Choose a new password"
        subtitle={user ? `Signed in as ${user.email} via a one-time link.` : 'Open the link from your email to continue.'}
      />
      {user ? (
        <form onSubmit={submit} className="stack-3">
          <PasswordField id="new-password" label="New password" value={password} onChange={setPassword} autoComplete="new-password" showStrength />
          <div className="field">
            <label htmlFor="confirm">Confirm</label>
            <input id="confirm" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <label className="checkbox-row">
            <input type="checkbox" checked={others} onChange={(e) => setOthers(e.target.checked)} />
            Sign out of all other devices
          </label>
          {error && (
            <p className="notice notice-danger" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-primary auth-wide" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Set password and continue'}
          </button>
        </form>
      ) : (
        <p className="notice notice-warning">This link has expired or was already used. Request a new one.</p>
      )}
      <footer className="auth-card-foot">
        <Link to={AUTH_PATHS.reset}>Request a new link</Link>
      </footer>
    </AuthLayout>
  )
}
