import type { AnalyticsOverview, Overview } from '../../lib/types'

/** Pure helpers for the overview charts (design Main / OverviewSales / OverviewFirstRun). Nothing is estimated. */

export type SalesModeFilter = '' | 'Customer' | 'Partner' | 'Investor' | 'Freelance'

/** Sales may narrow to one mode; empty = all four Sales modes. */
export function analyticsPath(workspace: 'candidate' | 'sales', days = 30, salesMode: SalesModeFilter = ''): string {
  const mode = workspace === 'sales' && salesMode ? `&mode=${salesMode}` : ''
  return `/api/v1/analytics/overview?workspace=${workspace === 'sales' ? 'Sales' : 'Candidate'}&days=${days}${mode}`
}

/** First run: nothing set up yet, so the page shows the workspace choice and three steps instead of empty charts. */
export function isFirstRun(overview: Overview | undefined): boolean {
  return Boolean(overview && overview.profiles === 0 && overview.campaigns === 0)
}

export function percent(rate: number | null | undefined): string {
  return typeof rate === 'number' ? `${Math.round(rate * 100)}%` : '—'
}

export interface FunnelRow {
  key: string
  label: string
  count: number | null
  note: string
  /** 0–100, relative to the first row. */
  width: number
  /** "34% of previous", or null for the first row / unknown values. */
  ofPrevious: string | null
}

export function funnelRows(funnel: AnalyticsOverview['funnel']): FunnelRow[] {
  const top = Math.max(1, ...funnel.map((f) => f.count ?? 0))
  return funnel.map((f, i) => {
    const prev = i > 0 ? funnel[i - 1].count : null
    const ofPrevious =
      i === 0 || f.count === null || prev === null ? null : prev === 0 ? '—' : `${Math.round((f.count / prev) * 100)}% of previous`
    return { ...f, width: f.count === null ? 0 : Math.round((f.count / top) * 100), ofPrevious }
  })
}

/** Bar heights for the fit histogram, 0–100 relative to the tallest band. */
export function histogramHeights(bands: AnalyticsOverview['fitHistogram']['bands']): number[] {
  const max = Math.max(0, ...bands.map((b) => b.count))
  return bands.map((b) => (max === 0 ? 0 : Math.round((b.count / max) * 100)))
}

/** Share bars for ranked lists (unknown criteria, industries, signals): width relative to the largest. */
export function shareWidths(values: number[]): number[] {
  const max = Math.max(0, ...values)
  return values.map((v) => (max === 0 ? 0 : Math.round((v / max) * 100)))
}

export function hasAnyActivity(a: AnalyticsOverview | undefined): boolean {
  return Boolean(a && (a.kpis.found > 0 || a.sources.length > 0 || a.funnel.some((f) => (f.count ?? 0) > 0)))
}

const ATTENTION_LINKS: Record<AnalyticsOverview['attention'][number]['kind'], { to: string; action: string; tone: string }> = {
  Approvals: { to: '/approvals', action: 'Open approvals', tone: 'warning' },
  ShortlistedNotApplied: { to: '/opportunities', action: 'See them', tone: 'neutral' },
  AgentNeedsYou: { to: '/applications', action: 'Review', tone: 'warning' },
  SourceFailing: { to: '/campaigns', action: 'Fix source', tone: 'danger' },
  FollowUpsOverdue: { to: '/follow-ups', action: 'Open follow-ups', tone: 'warning' },
}

export function attentionLink(kind: AnalyticsOverview['attention'][number]['kind']) {
  return ATTENTION_LINKS[kind]
}

const shortDate = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })

export function formatShortDate(iso: string | null): string {
  return iso ? shortDate.format(new Date(iso)) : '—'
}
