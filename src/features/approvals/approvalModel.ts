import type { ApprovalItem, DecideRequest, DecideResult } from '../../lib/types'

export const APPROVAL_PAGE_SIZE = 100
/** The decide endpoint accepts at most this many ids (approve + reject) per request. */
export const DECIDE_MAX_IDS = 200

export function approvalsPath(campaignId: string | null | undefined, skip: number, take = APPROVAL_PAGE_SIZE): string {
  const query = new URLSearchParams()
  if (campaignId) query.set('campaignId', campaignId)
  query.set('take', String(take))
  query.set('skip', String(skip))
  return `/api/v1/approvals?${query}`
}

/** Offset paging can repeat an item when the queue changes between pages; keep the first copy. */
export function appendUniqueItems(existing: ApprovalItem[], next: ApprovalItem[]): ApprovalItem[] {
  const seen = new Set(existing.map((i) => i.opportunityId))
  const out = [...existing]
  for (const item of next) {
    if (seen.has(item.opportunityId)) continue
    seen.add(item.opportunityId)
    out.push(item)
  }
  return out
}

export interface CampaignGroup {
  campaignId: string
  campaignName: string
  items: ApprovalItem[]
}

/**
 * Groups items by campaign, keeping the server's order (highest score first) inside each group.
 * Groups are ordered by their first (best) item, so the strongest suggestions stay on top.
 */
export function groupByCampaign(items: ApprovalItem[]): CampaignGroup[] {
  const groups = new Map<string, CampaignGroup>()
  for (const item of items) {
    let group = groups.get(item.campaignId)
    if (!group) {
      group = { campaignId: item.campaignId, campaignName: item.campaignName || 'Unnamed campaign', items: [] }
      groups.set(item.campaignId, group)
    }
    group.items.push(item)
  }
  return [...groups.values()]
}

// ---------- Selection ----------

export function selectAll(items: ApprovalItem[]): Set<string> {
  return new Set(items.map((i) => i.opportunityId))
}

export function selectNone(): Set<string> {
  return new Set()
}

export function toggleSelected(selected: Set<string>, id: string, on: boolean): Set<string> {
  const next = new Set(selected)
  if (on) next.add(id)
  else next.delete(id)
  return next
}

/** Drops ids that are no longer in the list (after a reload), so nothing invisible stays selected. */
export function pruneSelection(selected: Set<string>, items: ApprovalItem[]): Set<string> {
  const visible = new Set(items.map((i) => i.opportunityId))
  return new Set([...selected].filter((id) => visible.has(id)))
}

export type SelectAllState = 'none' | 'some' | 'all'

/** Drives the select-all checkbox: checked, unchecked or indeterminate. */
export function selectAllState(items: ApprovalItem[], selected: Set<string>): SelectAllState {
  if (items.length === 0) return 'none'
  const count = items.filter((i) => selected.has(i.opportunityId)).length
  if (count === 0) return 'none'
  return count === items.length ? 'all' : 'some'
}

// ---------- Decide payload ----------

/**
 * The decide body: blanks and duplicates removed, and an id that appears in both lists is left out of both —
 * an ambiguous instruction is not acted on. The API rejects a body with an id in both lists.
 */
export function decidePayload(approve: Iterable<string>, reject: Iterable<string>): DecideRequest {
  const a = new Set([...approve].filter(Boolean))
  const r = new Set([...reject].filter(Boolean))
  const both = new Set([...a].filter((id) => r.has(id)))
  return {
    approve: [...a].filter((id) => !both.has(id)),
    reject: [...r].filter((id) => !both.has(id)),
  }
}

/** Splits a decide body into requests of at most `max` ids each (approvals first, then rejections). */
export function decideBatches(payload: DecideRequest, max = DECIDE_MAX_IDS): DecideRequest[] {
  const all = [
    ...payload.approve.map((id) => ({ id, approve: true })),
    ...payload.reject.map((id) => ({ id, approve: false })),
  ]
  const batches: DecideRequest[] = []
  for (let i = 0; i < all.length; i += max) {
    const chunk = all.slice(i, i + max)
    batches.push({
      approve: chunk.filter((c) => c.approve).map((c) => c.id),
      reject: chunk.filter((c) => !c.approve).map((c) => c.id),
    })
  }
  return batches
}

export function addResults(a: DecideResult, b: DecideResult): DecideResult {
  return { approved: a.approved + b.approved, rejected: a.rejected + b.rejected, skipped: a.skipped + b.skipped }
}

export const EMPTY_RESULT: DecideResult = { approved: 0, rejected: 0, skipped: 0 }

/** "Approved 3 · rejected 0 · skipped 1" — the server's counts, as returned. */
export function resultSummary(r: DecideResult): string {
  return `Approved ${r.approved} · rejected ${r.rejected} · skipped ${r.skipped}`
}
