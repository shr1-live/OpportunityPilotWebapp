import type { SalesBid, SalesBidState, SalesProject, SalesProjectSource, SalesProjectState } from '../../lib/types'

export interface SalesBidRow {
  project: SalesProject
  bid: SalesBid
}

export const SALES_PROJECT_SOURCES: SalesProjectSource[] = ['Upwork', 'Manual', 'Freelancer', 'TenderFeed', 'PublicUrl']
export const SALES_PROJECT_STATES: SalesProjectState[] = [
  'New',
  'Shortlisted',
  'BidPrepared',
  'BidApproved',
  'BidPlaced',
  'ManualHandoff',
  'Dismissed',
]

const PROJECT_STATE_LABELS: Record<SalesProjectState, string> = {
  New: 'New',
  Shortlisted: 'Shortlisted',
  BidPrepared: 'Bid prepared',
  BidApproved: 'Bid approved',
  BidPlaced: 'Bid placed',
  ManualHandoff: 'Manual handoff',
  Dismissed: 'Dismissed',
}

const SOURCE_LABELS: Record<SalesProjectSource, string> = {
  Upwork: 'Upwork',
  Manual: 'Manual',
  Freelancer: 'Freelancer.com',
  TenderFeed: 'Tender feed',
  PublicUrl: 'Public URL',
}

export interface SalesProviderEvidence {
  provider?: string
  connectsCost?: number | null
  experienceLevel?: string | null
  budget?: string | null
  publishedAt?: string | null
  importedManually?: boolean
  observedAt?: string
}

export function salesProviderEvidence(project: SalesProject): SalesProviderEvidence {
  try {
    const value: unknown = JSON.parse(project.evidenceJson)
    return value && typeof value === 'object' && !Array.isArray(value) ? value as SalesProviderEvidence : {}
  } catch {
    return {}
  }
}

const BID_STATE_LABELS: Record<SalesBidState, string> = {
  Draft: 'Draft',
  Approved: 'Approved',
  Placed: 'Placed',
  Failed: 'Failed',
}

export const salesProjectStateLabel = (state: SalesProjectState) => PROJECT_STATE_LABELS[state]
export const salesProjectSourceLabel = (source: SalesProjectSource) => SOURCE_LABELS[source]
export const salesBidStateLabel = (state: SalesBidState) => BID_STATE_LABELS[state]

export function salesBidRows(projects: SalesProject[]): SalesBidRow[] {
  return projects
    .flatMap((project) => project.bids.map((bid) => ({ project, bid })))
    .toSorted((a, b) => Date.parse(b.bid.updatedAt) - Date.parse(a.bid.updatedAt))
}

export function isBidFormValid(amount: string, currency: string, deliveryDays: string, proposal: string): boolean {
  const parsedAmount = Number(amount)
  const parsedDays = Number(deliveryDays)
  return (
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    /^[A-Z]{3}$/.test(currency) &&
    Number.isInteger(parsedDays) &&
    parsedDays >= 1 &&
    parsedDays <= 3650 &&
    proposal.trim().length > 0
  )
}
