import type { CapabilityStatus } from '../lib/types'

const LABELS: Record<CapabilityStatus, { text: string; tone: string }> = {
  Ready: { text: 'Ready', tone: 'success' },
  Configured: { text: 'Configured · unverified', tone: 'primary' },
  NotConfigured: { text: 'Not configured', tone: 'warning' },
  Disabled: { text: 'Disabled', tone: 'neutral' },
  ManualHandoff: { text: 'Manual handoff', tone: 'neutral' },
  NotBuilt: { text: 'Not built yet', tone: 'neutral' },
  LocalAgent: { text: 'Local agent · beta', tone: 'primary' },
}

/** Status colour is always paired with words. */
export function StatusBadge({ status }: { status: CapabilityStatus }) {
  const { text, tone } = LABELS[status]
  return <span className={`badge badge-${tone}`}>{text}</span>
}

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}
