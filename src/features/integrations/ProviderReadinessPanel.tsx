import { ErrorNotice } from '../../components/ErrorNotice'
import { LoadingState } from '../../components/States'
import { Badge } from '../../components/StatusBadge'
import { useApi } from '../../lib/useApi'

type Support = 'Automatic' | 'Assisted' | 'Manual' | 'None'
type Row = {
  key: string; name: string; workspaces: string[]; discovery: Support; drafting: Support; approval: Support; execution: Support
  credential: string | null; credentialSet: boolean; manualStep: string; riskNote: string; lastVerified: string | null; lastVerifiedWhat: string | null
  tasks: string
}

const TONE: Record<Support, string> = { Automatic: 'success', Assisted: 'primary', Manual: 'warning', None: 'neutral' }
const LABEL: Record<Support, string> = { Automatic: 'App does it', Assisted: 'App helps', Manual: 'You do it', None: '—' }

/** P7: what each provider supports at every step, what it needs, and when it last worked for you (stored records only). */
export function ProviderReadinessPanel() {
  const rows = useApi<Row[]>('/api/v1/providers/readiness')
  return <section className="panel" aria-labelledby="readiness-heading">
    <header className="panel-head"><h3 id="readiness-heading" className="eyebrow">Provider readiness</h3><span className="grow" />
      <span className="muted-small">Discovery → drafting → approval → execution. "You do it" steps are recorded with a receipt.</span></header>
    {rows.error ? <ErrorNotice error={rows.error} onRetry={rows.reload} what="provider readiness" />
      : !rows.data ? <LoadingState label="Loading provider readiness…" waking={rows.waking} />
      : <div className="table-scroll"><table className="table">
        <thead><tr><th>Provider</th><th>Find</th><th>Draft</th><th>Approve</th><th>Execute</th><th>Needs</th><th>Last worked for you</th></tr></thead>
        <tbody>{rows.data.map((r) => <tr key={r.key}>
          <td><strong>{r.name}</strong><div className="muted-small">{r.workspaces.join(' · ')} · {r.riskNote}</div><div className="muted-small">{r.manualStep}</div></td>
          {([r.discovery, r.drafting, r.approval, r.execution] as Support[]).map((s, i) => <td key={i}><Badge tone={TONE[s]}>{LABEL[s]}</Badge></td>)}
          <td className="small">{r.credential ? <>{r.credential} <Badge tone={r.credentialSet ? 'success' : 'warning'}>{r.credentialSet ? 'set' : 'not set'}</Badge></> : 'Nothing'}</td>
          <td className="small">{r.lastVerified ? <>{new Date(r.lastVerified).toLocaleString()}<div className="muted-small">{r.lastVerifiedWhat}</div></> : <span className="muted-small">Not yet</span>}</td>
        </tr>)}</tbody>
      </table></div>}
  </section>
}
