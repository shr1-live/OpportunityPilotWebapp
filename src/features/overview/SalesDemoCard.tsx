import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorNotice } from '../../components/ErrorNotice'
import { api } from '../../lib/api'
import type { SalesDemoStatus } from '../../lib/types'
import { useApi } from '../../lib/useApi'

export function SalesDemoCard({ onChanged }: { onChanged: () => void }) {
  const status = useApi<SalesDemoStatus>('/api/v1/demo/sales')
  const { data, loading, reload } = status
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<Error>()
  const finishing = useRef(false)

  useEffect(() => {
    if (!data?.exists || data.researchDone) return
    const timer = setInterval(reload, 2500)
    return () => clearInterval(timer)
  }, [data?.exists, data?.researchDone, reload])

  useEffect(() => {
    const value = data
    if (!value?.exists || !value.researchDone || value.shortlisted > 0 || finishing.current) return
    finishing.current = true
    setBusy(true)
    api<SalesDemoStatus>('/api/v1/demo/sales/finish', { method: 'POST' })
      .then(() => {
        setError(undefined)
        reload()
        onChanged()
      })
      .catch((reason: Error) => setError(reason))
      .finally(() => setBusy(false))
  }, [data, reload, onChanged])

  async function start() {
    setBusy(true)
    setError(undefined)
    finishing.current = false
    try {
      await api<SalesDemoStatus>('/api/v1/demo/sales', { method: 'POST' })
      reload()
      onChanged()
    } catch (reason) {
      setError(reason as Error)
    } finally {
      setBusy(false)
    }
  }

  async function reset() {
    if (!window.confirm('Remove only your fictional “Demo —” Sales records? Your other data will stay.')) return
    setBusy(true)
    setError(undefined)
    try {
      await api('/api/v1/demo/sales', { method: 'DELETE' })
      finishing.current = false
      reload()
      onChanged()
    } catch (reason) {
      setError(reason as Error)
    } finally {
      setBusy(false)
    }
  }

  const value = data
  const complete = Boolean(value?.researchDone && value.shortlisted > 0)
  return (
    <section className="card stack-3 sample-run">
      <div className="row">
        <h3 className="section-heading">See the complete Sales workflow</h3>
        <span className={`badge ${complete ? 'badge-success' : 'badge-primary'}`}>{complete ? 'Ready' : 'Fictional demo'}</span>
      </div>
      <p className="muted-small">
        One action creates clearly labelled fictional Customer, Partner, Investor and Freelance campaigns. Normal research scores
        their evidence, then the demo prepares shortlists, email, LinkedIn and cover-note drafts, follow-ups, and a staffing journey through
        candidate submission, interview, feedback, accepted offer, signed contract and placement.
        Nothing is sent to an external provider.
      </p>
      {error && <ErrorNotice error={error} onRetry={reload} />}
      {value?.exists && (
        <dl className="criteria-list">
          <div><dt>Campaigns</dt><dd className="op-numeric">{value.campaigns}</dd></div>
          <div><dt>Opportunities</dt><dd className="op-numeric">{value.opportunities}</dd></div>
          <div><dt>Shortlisted</dt><dd className="op-numeric">{value.shortlisted}</dd></div>
          <div><dt>Drafts</dt><dd className="op-numeric">{value.drafts}</dd></div>
          <div><dt>Staffing deals</dt><dd className="op-numeric">{value.staffingDeals}</dd></div>
        </dl>
      )}
      <div className="row">
        {!value?.exists && (
          <button type="button" className="btn btn-primary btn-sm" onClick={start} disabled={busy || loading}>
            {busy ? 'Creating…' : 'Create Sales demo'}
          </button>
        )}
        {value?.exists && !complete && (
          <span className="muted-small" role="status" aria-live="polite">
            {value.researchDone ? 'Preparing approved records…' : 'Research is running…'}
          </span>
        )}
        {complete && <Link className="btn btn-primary btn-sm" to="/opportunities">Review companies</Link>}
        {complete && <Link className="btn btn-secondary btn-sm" to="/outreach">Review drafts</Link>}
        {value?.exists && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={reset} disabled={busy}>Reset demo</button>
        )}
      </div>
    </section>
  )
}
