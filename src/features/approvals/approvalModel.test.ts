import { describe, expect, it } from 'vitest'
import type { ApprovalItem } from '../../lib/types'
import {
  addResults,
  appendUniqueItems,
  approvalsPath,
  decideBatches,
  decidePayload,
  DECIDE_MAX_IDS,
  EMPTY_RESULT,
  groupByCampaign,
  pruneSelection,
  resultSummary,
  selectAll,
  selectAllState,
  selectNone,
  toggleSelected,
} from './approvalModel'

const item = (id: string, campaignId = 'c1', score = 80): ApprovalItem => ({
  opportunityId: id,
  campaignId,
  campaignName: `Campaign ${campaignId}`,
  title: `Job ${id}`,
  organization: 'Org',
  location: null,
  platform: 'Greenhouse',
  applyUrl: null,
  score,
  coverage: 70,
  outcomeReason: null,
  appliesVia: 'You',
})

describe('approvalsPath', () => {
  it('pages the queue and filters by campaign only when one is chosen', () => {
    expect(approvalsPath(null, 0)).toBe('/api/v1/approvals?take=100&skip=0')
    expect(approvalsPath('abc', 100)).toBe('/api/v1/approvals?campaignId=abc&take=100&skip=100')
  })
})

describe('groupByCampaign', () => {
  it('groups by campaign, keeping the server order inside a group and ordering groups by their best item', () => {
    const groups = groupByCampaign([item('a', 'c2', 95), item('b', 'c1', 90), item('c', 'c2', 85), item('d', 'c1', 81)])
    expect(groups.map((g) => g.campaignId)).toEqual(['c2', 'c1'])
    expect(groups[0].items.map((i) => i.opportunityId)).toEqual(['a', 'c'])
    expect(groups[1].items.map((i) => i.opportunityId)).toEqual(['b', 'd'])
    expect(groups[0].campaignName).toBe('Campaign c2')
  })

  it('returns no groups for an empty queue', () => {
    expect(groupByCampaign([])).toEqual([])
  })
})

describe('selection', () => {
  const items = [item('a'), item('b'), item('c')]

  it('selects all and none', () => {
    expect([...selectAll(items)]).toEqual(['a', 'b', 'c'])
    expect(selectNone().size).toBe(0)
  })

  it('toggles one id without mutating the previous set', () => {
    const before = new Set(['a'])
    const after = toggleSelected(before, 'b', true)
    expect([...after].sort()).toEqual(['a', 'b'])
    expect([...before]).toEqual(['a'])
    expect([...toggleSelected(after, 'a', false)]).toEqual(['b'])
  })

  it('reports none / some / all for the select-all checkbox', () => {
    expect(selectAllState(items, new Set())).toBe('none')
    expect(selectAllState(items, new Set(['a']))).toBe('some')
    expect(selectAllState(items, new Set(['a', 'b', 'c']))).toBe('all')
    expect(selectAllState([], new Set(['a']))).toBe('none')
  })

  it('drops selected ids that are no longer listed', () => {
    expect([...pruneSelection(new Set(['a', 'gone']), items)]).toEqual(['a'])
  })
})

describe('decide payload', () => {
  it('never puts one id in both lists — an ambiguous id is left out of both', () => {
    const p = decidePayload(['a', 'b'], ['b', 'c'])
    expect(p).toEqual({ approve: ['a'], reject: ['c'] })
    expect(p.approve.filter((id) => p.reject.includes(id))).toEqual([])
  })

  it('removes duplicates and blanks', () => {
    expect(decidePayload(['a', 'a', ''], new Set(['c']))).toEqual({ approve: ['a'], reject: ['c'] })
  })

  it('splits large decisions into requests of at most 200 ids', () => {
    const approve = Array.from({ length: 250 }, (_, i) => `a${i}`)
    const reject = Array.from({ length: 30 }, (_, i) => `r${i}`)
    const batches = decideBatches({ approve, reject })
    expect(batches).toHaveLength(2)
    for (const b of batches) expect(b.approve.length + b.reject.length).toBeLessThanOrEqual(DECIDE_MAX_IDS)
    expect(batches.flatMap((b) => b.approve)).toEqual(approve)
    expect(batches.flatMap((b) => b.reject)).toEqual(reject)
  })

  it('sends nothing for an empty decision', () => {
    expect(decideBatches({ approve: [], reject: [] })).toEqual([])
  })
})

describe('results', () => {
  it('adds batch counts and words them as returned', () => {
    const total = addResults(addResults(EMPTY_RESULT, { approved: 2, rejected: 0, skipped: 1 }), {
      approved: 1,
      rejected: 3,
      skipped: 0,
    })
    expect(total).toEqual({ approved: 3, rejected: 3, skipped: 1 })
    expect(resultSummary(total)).toBe('Approved 3 · rejected 3 · skipped 1')
  })
})

describe('appendUniqueItems', () => {
  it('keeps the first copy when pages overlap', () => {
    expect(appendUniqueItems([item('a'), item('b')], [item('b'), item('c')]).map((i) => i.opportunityId)).toEqual([
      'a',
      'b',
      'c',
    ])
  })
})
