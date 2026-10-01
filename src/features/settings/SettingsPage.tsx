import { config } from '../../lib/config'
import { useAuth } from '../auth/AuthProvider'
import { useShell } from '../shell/ShellContext'

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
const AUTH_LABEL = { supabase: 'Supabase', dev: 'Development sign-in (local only)', guest: 'Guest (demo mode)' }

/** Read-only in this build: nothing here is saved server-side yet, so no control pretends to be. */
export function SettingsPage() {
  const { user, mode, signOut } = useAuth()
  const { capabilities } = useShell()

  return (
    <div className="page stack-6">
      <div className="page-head">
        <div>
          <h2 className="page-title">Settings</h2>
          <p className="page-sub">Account and deployment facts. Editable research defaults arrive with campaigns (M2).</p>
        </div>
      </div>

      <section className="card stack-3">
        <h3 className="section-heading">Account</h3>
        <dl className="facts">
          <div>
            <dt>Signed in as</dt>
            <dd>{user?.email}</dd>
          </div>
          <div>
            <dt>Sign-in method</dt>
            <dd>{AUTH_LABEL[mode]}</dd>
          </div>
          <div>
            <dt>Time zone</dt>
            <dd>
              {timeZone} <span className="muted-small">· from this browser</span>
            </dd>
          </div>
        </dl>
        <div>
          <button type="button" className="btn btn-secondary" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </section>

      <section className="card stack-3">
        <h3 className="section-heading">Deployment</h3>
        <dl className="facts">
          <div>
            <dt>API</dt>
            <dd className="mono">{config.apiBaseUrl}</dd>
          </div>
          <div>
            <dt>Environment</dt>
            <dd>{capabilities?.environment ?? '—'}</dd>
          </div>
          <div>
            <dt>Database</dt>
            <dd>{capabilities?.databaseProvider ?? '—'}</dd>
          </div>
          <div>
            <dt>AI mode</dt>
            <dd>{capabilities?.aiMode ?? '—'}</dd>
          </div>
        </dl>
      </section>

      <section className="card stack-3">
        <h3 className="section-heading">Outreach safety</h3>
        <p className="muted-small">These rules are fixed, not preferences, and apply once outreach exists (M5).</p>
        <ul className="small stack-2">
          <li>Every draft version needs your explicit approval. Editing the recipient or body clears it.</li>
          <li>Sending is blocked for recipients whose address no source supplied.</li>
          <li>Demo data, when offered, is labelled everywhere and never mixes with researched results.</li>
        </ul>
      </section>
    </div>
  )
}
