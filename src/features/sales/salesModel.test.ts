import { describe, expect, it } from 'vitest'
import type { SalesBid, SalesProject } from '../../lib/types'
import { isBidFormValid, salesBidRows, salesProjectSourceLabel, salesProjectStateLabel } from './salesModel'

function bid(id: string, updatedAt: string): SalesBid {
  return {
    id,
    projectId: 'project',
    amount: 500,
    currency: 'USD',
    deliveryDays: 7,
    proposal: 'Proposal',
    version: 1,
    state: 'Draft',
    approvedVersion: null,
    approvedAt: null,
    hasValidApproval: false,
    createdAt: updatedAt,
    updatedAt,
  }
}

function project(id: string, bids: SalesBid[]): SalesProject {
  return {
    id,
    source: 'Manual',
    externalId: null,
    title: `Project ${id}`,
    buyer: null,
    description: null,
    url: null,
    deadlineUtc: null,
    state: 'New',
    version: 1,
    bids,
    createdAt: '2026-10-06T00:00:00Z',
    updatedAt: '2026-10-06T00:00:00Z',
  }
}

describe('sales model', () => {
  it('flattens bid rows newest first while retaining their project', () => {
    const rows = salesBidRows([
      project('a', [bid('old', '2026-10-06T00:00:00Z')]),
      project('b', [bid('new', '2026-10-07T00:00:00Z')]),
    ])
    expect(rows.map((row) => [row.project.id, row.bid.id])).toEqual([
      ['b', 'new'],
      ['a', 'old'],
    ])
  })

  it('validates all user-provided bid fields', () => {
    expect(isBidFormValid('1200.50', 'USD', '14', 'A factual proposal')).toBe(true)
    expect(isBidFormValid('0', 'USD', '14', 'Proposal')).toBe(false)
    expect(isBidFormValid('10', 'US', '14', 'Proposal')).toBe(false)
    expect(isBidFormValid('10', 'USD', '0', 'Proposal')).toBe(false)
    expect(isBidFormValid('10', 'USD', '14', '   ')).toBe(false)
  })

  it('uses readable source and state labels', () => {
    expect(salesProjectSourceLabel('Freelancer')).toBe('Freelancer.com')
    expect(salesProjectStateLabel('BidPrepared')).toBe('Bid prepared')
  })
})
