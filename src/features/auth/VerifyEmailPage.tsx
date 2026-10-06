import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AuthCardHeader, AuthLayout } from './AuthLayout'
import { AUTH_PATHS, formatCountdown, resendSecondsLeft } from './authModel'
import { useAuth } from './AuthProvider'

/** Design AuthVerify: check-your-email, resend on a cooldown, why it may not have arrived, change address. */
export function VerifyEmailPage() {
  const { resendVerification } = useAuth()
  const [params] = useSearchParams()
  const email = params.get('email') ?? ''
  const [sentAt, setSentAt] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())
  const [message, setMessage] = useState<{ kind: 'info' | 'error'; text: string } | null>(null)
  const left = resendSecondsLeft(sentAt, now)

  useEffect(() => {
    if (left === 0) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [left])

  async function resend() {
    setMessage(null)
    try {
      await resendVerification(email)
      setSentAt(Date.now())
      setNow(Date.now())
      setMessage({ kind: 'info', text: 'Sent again. Use the newest email — earlier links still work until they expire.' })
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message })
    }
  }

  return (
    <AuthLayout
      headline="One link, and you are in."
      lead="We verify the address so password resets actually reach you, and so a campaign you schedule has somewhere to report back to."
      asideTitle="Why verify"
      asideItems={['Password resets reach you', 'Nothing is sent to an unverified address']}
    >
      <AuthCardHeader title="Check your email" subtitle="Your account is created but not yet verified." />
      <p>
        We sent a link to <strong>{email || 'your address'}</strong>. Open it on this device and you will land straight in
        your workspace.
      </p>
      <div className="notice notice-neutral stack-1">
        <strong>Not arrived?</strong>
        <ul className="auth-list">
          <li>It can take a minute.</li>
          <li>Check spam; the sender is a Supabase address, not our domain.</li>
          <li>The link expires in 60 minutes.</li>
        </ul>
      </div>
      {message && (
        <p className={`notice ${message.kind === 'error' ? 'notice-danger' : 'notice-success'}`} role="status">
          {message.text}
        </p>
      )}
      <div className="row">
        <button type="button" className="btn btn-secondary" disabled={left > 0 || !email} onClick={() => void resend()}>
          {left > 0 ? `Resend in ${formatCountdown(left)}` : 'Resend email'}
        </button>
        <div className="grow" />
        <Link to={AUTH_PATHS.signup}>Use a different email</Link>
      </div>
      <footer className="auth-card-foot">
        Already verified? <Link to={AUTH_PATHS.signin}>Sign in</Link>
      </footer>
    </AuthLayout>
  )
}
