import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorNotice } from '../../components/ErrorNotice'
import { api } from '../../lib/api'
import { SAMPLE_SOURCES, SAMPLE_SUGGEST_AT, sampleCampaign, sampleProfile } from './sampleRunModel'

/** One click: create a sample profile + campaign on two public job boards, queue research, open the live run. */
export function SampleRunCard() {
  const navigate = useNavigate()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<Error>()

  async function start() {
    setError(undefined)
    try {
      setBusy('Creating the sample profile…')
      const profile = await api<{ id: string }>('/api/v1/profiles', { method: 'POST', body: JSON.stringify(sampleProfile()) })
      setBusy('Creating the sample campaign…')
      const campaign = await api<{ id: string }>('/api/v1/campaigns', {
        method: 'POST',
        body: JSON.stringify(sampleCampaign(profile.id)),
      })
      for (const s of SAMPLE_SOURCES) {
        setBusy(`Adding source: ${s.label}…`)
        await api(`/api/v1/campaigns/${campaign.id}/sources`, {
          method: 'POST',
          body: JSON.stringify({ kind: s.kind, url: s.url }),
        })
      }
      setBusy('Queuing the research run…')
      const { jobId } = await api<{ jobId: string }>(`/api/v1/campaigns/${campaign.id}/research`, { method: 'POST' })
      navigate(`/research/${jobId}`)
    } catch (e) {
      setError(e as Error)
      setBusy(null)
    }
  }

  return (
    <section className="hero-strip">
      <div className="hero-strip-text">
        <div className="row wrap">
          <h3 className="section-heading">See it work on real job boards</h3>
          <span className="badge badge-primary">Live data</span>
        </div>
        <p className="muted-small">
          One click reads {SAMPLE_SOURCES.map((s) => s.label).join(' and ')}, then filters and scores every job in about a minute.
          Jobs scoring {SAMPLE_SUGGEST_AT}+ go to Approvals. Nothing is applied for you.
        </p>
        {error && <ErrorNotice error={error} onRetry={start} />}
      </div>
      <div className="row wrap hero-strip-actions">
        <button type="button" className="btn btn-primary" onClick={start} disabled={busy !== null}>
          {busy ? 'Starting…' : 'Start sample run'}
        </button>
        {busy && (
          <span className="muted-small" role="status">
            {busy}
          </span>
        )}
      </div>
    </section>
  )
}
