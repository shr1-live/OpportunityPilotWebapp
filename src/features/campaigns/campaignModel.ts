import type {
  CampaignCriteria,
  OpportunityMode,
  ProfileType,
  SourceKind,
  SourceStatus,
  WorkMode,
} from '../../lib/types'

export type SupportedMode = Extract<OpportunityMode, 'Job' | 'Customer'>

export const MODES: { mode: OpportunityMode; label: string; description: string; supported: boolean }[] = [
  { mode: 'Job', label: 'Jobs', description: 'Postings that fit your experience', supported: true },
  { mode: 'Customer', label: 'Customers', description: 'Companies with a problem you solve', supported: true },
  { mode: 'Partner', label: 'Partners', description: 'Companies to build or resell with', supported: false },
  { mode: 'Investor', label: 'Investors', description: 'Funds that back your stage', supported: false },
  { mode: 'Freelance', label: 'Freelance', description: 'Projects that need your services', supported: false },
]

export const MODE_LABELS: Record<OpportunityMode, string> = {
  Job: 'Job',
  Customer: 'Customer',
  Partner: 'Partner',
  Investor: 'Investor',
  Freelance: 'Freelance',
}

export function isSupportedMode(mode: OpportunityMode): mode is SupportedMode {
  return mode === 'Job' || mode === 'Customer'
}

/** A sensible starting mode for the profile the user picked; they can still change it before saving. */
export function suggestedMode(profileType: ProfileType | undefined): SupportedMode {
  return profileType === 'Candidate' ? 'Job' : 'Customer'
}

export const WORK_MODES: { value: WorkMode; label: string }[] = [
  { value: 'Remote', label: 'Remote' },
  { value: 'Hybrid', label: 'Hybrid' },
  { value: 'Onsite', label: 'On-site' },
]

export const RESULT_LIMIT = { min: 1, max: 100, default: 25 }

export function emptyCriteria(): CampaignCriteria {
  return {
    keywords: [],
    requiredSkills: [],
    preferredSkills: [],
    candidateYears: null,
    locations: [],
    workModes: [],
    industries: [],
    problems: [],
    signals: [],
    excludeKeywords: [],
    excludeOrganizations: [],
  }
}

/** Which criteria each mode uses. The rest are cleared on save so they cannot silently affect a run. */
const MODE_FIELDS: Record<SupportedMode, (keyof CampaignCriteria)[]> = {
  Job: ['keywords', 'requiredSkills', 'preferredSkills', 'candidateYears', 'locations', 'workModes', 'excludeKeywords', 'excludeOrganizations'],
  Customer: ['keywords', 'industries', 'problems', 'locations', 'signals', 'excludeKeywords', 'excludeOrganizations'],
}

/** Fills gaps in a criteria object from the server (older rows may miss newer lists) and drops other modes' fields. */
export function criteriaForMode(mode: SupportedMode, criteria: Partial<CampaignCriteria> | undefined): CampaignCriteria {
  const base = emptyCriteria()
  const keep = new Set(MODE_FIELDS[mode])
  for (const key of Object.keys(base) as (keyof CampaignCriteria)[]) {
    if (!keep.has(key)) continue
    const value = criteria?.[key]
    if (key === 'candidateYears') {
      base.candidateYears = typeof value === 'number' && Number.isFinite(value) ? value : null
    } else if (Array.isArray(value)) {
      // workModes is narrowed below; every other list is free text.
      ;(base as unknown as Record<string, string[]>)[key] = normaliseTags(value as string[])
    }
  }
  if (base.workModes.length) base.workModes = base.workModes.filter((m) => WORK_MODES.some((w) => w.value === m))
  return base
}

// ---------- Tags ----------

export const TAG_MAX_LENGTH = 100
export const TAG_MAX_COUNT = 50

/** Splits typed or pasted text on commas and new lines and tidies each piece. */
export function parseTagInput(raw: string): string[] {
  return raw
    .split(/[,\n\r;]+/)
    .map((t) => t.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

const tagKey = (t: string) => t.toLocaleLowerCase()

/** Trimmed, case-insensitively unique, first spelling wins. */
export function normaliseTags(tags: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of tags) {
    const tag = raw.replace(/\s+/g, ' ').trim().slice(0, TAG_MAX_LENGTH)
    if (!tag || seen.has(tagKey(tag))) continue
    seen.add(tagKey(tag))
    out.push(tag)
  }
  return out
}

export interface AddTagsResult {
  values: string[]
  added: string[]
  duplicates: string[]
  /** Tags dropped because the list is full. */
  overflow: string[]
}

export function addTags(existing: string[], raw: string, max = TAG_MAX_COUNT): AddTagsResult {
  const values = [...existing]
  const seen = new Set(existing.map(tagKey))
  const result: AddTagsResult = { values, added: [], duplicates: [], overflow: [] }
  for (const piece of parseTagInput(raw)) {
    const tag = piece.slice(0, TAG_MAX_LENGTH)
    if (seen.has(tagKey(tag))) result.duplicates.push(tag)
    else if (values.length >= max) result.overflow.push(tag)
    else {
      seen.add(tagKey(tag))
      values.push(tag)
      result.added.push(tag)
    }
  }
  return result
}

// ---------- Weights ----------

export interface WeightDef {
  key: string
  label: string
  /** What turns the criterion on; when nothing is configured the server leaves it out of the score. */
  needs: string
}

export const WEIGHT_DEFS: Record<SupportedMode, WeightDef[]> = {
  Job: [
    { key: 'mandatorySkills', label: 'Required skills', needs: 'required skills' },
    { key: 'experience', label: 'Experience', needs: 'your years of experience' },
    { key: 'location', label: 'Location and work mode', needs: 'locations or work modes' },
    { key: 'preferredSkills', label: 'Preferred skills', needs: 'preferred skills' },
  ],
  Customer: [
    { key: 'industry', label: 'Industry', needs: 'industries' },
    { key: 'problem', label: 'Problem you solve', needs: 'problems' },
    { key: 'geography', label: 'Geography', needs: 'locations' },
    { key: 'signal', label: 'Published signals', needs: 'signals' },
    { key: 'contactPath', label: 'Contact path', needs: 'nothing — always scored' },
  ],
}

export const DEFAULT_WEIGHTS: Record<SupportedMode, Record<string, number>> = {
  Job: { mandatorySkills: 40, experience: 20, location: 20, preferredSkills: 20 },
  Customer: { industry: 25, problem: 30, geography: 15, signal: 20, contactPath: 10 },
}

export function clampWeight(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
}

/** The mode's criterion keys only, defaults for anything missing, each clamped to 0–100. */
export function weightsForMode(mode: SupportedMode, weights: Record<string, number> | undefined): Record<string, number> {
  return Object.fromEntries(
    WEIGHT_DEFS[mode].map((d) => [d.key, clampWeight(weights?.[d.key] ?? DEFAULT_WEIGHTS[mode][d.key])]),
  )
}

/**
 * Mirrors the contract: a criterion is left out of the score only when the user configured nothing for it.
 * Unknown evidence does not make it inapplicable — that still counts, as 0 points.
 */
export function applicableCriteria(mode: SupportedMode, c: CampaignCriteria): Set<string> {
  const on = new Set<string>()
  if (mode === 'Job') {
    if (c.requiredSkills.length) on.add('mandatorySkills')
    if (c.candidateYears !== null) on.add('experience')
    if (c.locations.length || c.workModes.length) on.add('location')
    if (c.preferredSkills.length) on.add('preferredSkills')
  } else {
    if (c.industries.length) on.add('industry')
    if (c.problems.length) on.add('problem')
    if (c.locations.length) on.add('geography')
    if (c.signals.length) on.add('signal')
    on.add('contactPath')
  }
  return on
}

/**
 * Preview of the server's normalisation: applicable weights scaled to sum 100 as whole numbers
 * (largest remainder, so the shares always add up). Not-applicable criteria get null.
 */
export function normaliseWeights(weights: Record<string, number>, applicable: Set<string>): Record<string, number | null> {
  const keys = Object.keys(weights)
  const active = keys.filter((k) => applicable.has(k))
  const total = active.reduce((sum, k) => sum + clampWeight(weights[k]), 0)
  const out: Record<string, number | null> = Object.fromEntries(keys.map((k) => [k, applicable.has(k) ? 0 : null]))
  if (total === 0) return out

  const exact = active.map((k) => ({ k, v: (clampWeight(weights[k]) * 100) / total }))
  let assigned = 0
  for (const e of exact) {
    out[e.k] = Math.floor(e.v)
    assigned += Math.floor(e.v)
  }
  // Hand the leftover points to the largest fractions; ties keep declaration order.
  const byRemainder = [...exact].sort((a, b) => b.v - Math.floor(b.v) - (a.v - Math.floor(a.v)))
  for (let i = 0; assigned < 100 && i < byRemainder.length; i++, assigned++) {
    const k = byRemainder[i].k
    out[k] = (out[k] ?? 0) + 1
  }
  return out
}

// ---------- Summaries and labels ----------

export interface CriteriaLine {
  label: string
  value: string
  kind: 'search' | 'hard' | 'soft'
}

const join = (xs: string[]) => xs.join(', ')

/** Plain-language lines for the review step; empty lists are not shown as if they were filters. */
export function criteriaSummary(mode: SupportedMode, c: CampaignCriteria): CriteriaLine[] {
  const lines: CriteriaLine[] = []
  const push = (label: string, value: string, kind: CriteriaLine['kind']) => value && lines.push({ label, value, kind })
  push(mode === 'Job' ? 'Job titles and search phrases' : 'Product and search words', join(c.keywords), 'search')
  if (mode === 'Job') {
    push('Required skills', join(c.requiredSkills), 'hard')
    push('Work modes', join(c.workModes.map((m) => WORK_MODES.find((w) => w.value === m)?.label ?? m)), 'hard')
    push('Locations', join(c.locations), 'hard')
    push('Preferred skills', join(c.preferredSkills), 'soft')
    push('Your experience', c.candidateYears === null ? '' : `${c.candidateYears} years`, 'soft')
  } else {
    push('Geography', join(c.locations), 'hard')
    push('Industries', join(c.industries), 'soft')
    push('Problems you solve', join(c.problems), 'soft')
    push('Signals', join(c.signals), 'soft')
  }
  push('Excluded keywords', join(c.excludeKeywords), 'hard')
  push('Excluded organisations', join(c.excludeOrganizations), 'hard')
  return lines
}

export const SOURCE_KIND_LABELS: Record<SourceKind, string> = {
  Paste: 'Pasted text',
  Csv: 'CSV import',
  Url: 'Public URL',
  Feed: 'RSS / Atom feed',
  Agent: 'Local agent',
}

export const SOURCE_STATUS_LABELS: Record<SourceStatus, { text: string; tone: string }> = {
  Pending: { text: 'Not fetched yet', tone: 'neutral' },
  Ok: { text: 'OK', tone: 'success' },
  Failed: { text: 'Failed', tone: 'danger' },
  Skipped: { text: 'Skipped', tone: 'neutral' },
}

/** Columns the CSV preview requires, per the contract. */
export const CSV_COLUMNS: Record<SupportedMode, { required: string[]; optional: string[] }> = {
  Job: { required: ['title', 'company'], optional: ['location', 'url', 'description', 'id'] },
  Customer: { required: ['name'], optional: ['website', 'country', 'industry', 'description'] },
}

export const PASTE_MAX_CHARS = 50_000
export const CSV_MAX_BYTES = 1024 * 1024

/** ASP.NET may key validation errors by property path in either casing ("Name", "criteria.Keywords"). */
export function fieldError(errors: Record<string, string[]> | undefined, key: string): string | undefined {
  if (!errors) return undefined
  const wanted = key.toLowerCase()
  const hits = Object.entries(errors).filter(([k]) => k.toLowerCase() === wanted || k.toLowerCase().endsWith(`.${wanted}`))
  return hits.length ? hits.flatMap(([, v]) => v).join(' ') : undefined
}

// ---------- Draft ----------

export interface CampaignDraft {
  profileId: string
  /** null on a new campaign until the user picks one; the profile type then suggests a mode. */
  mode: SupportedMode | null
  name: string
  goal: string
  criteria: CampaignCriteria
  /** Keys for both modes, so switching mode on a new campaign keeps what was typed for the other. */
  weights: Record<string, number>
  resultLimit: number
}

export const NAME_MAX = 200
export const GOAL_MAX = 2000
export const YEARS_MAX = 60

export function newDraft(): CampaignDraft {
  return {
    profileId: '',
    mode: null,
    name: '',
    goal: '',
    criteria: emptyCriteria(),
    weights: { ...DEFAULT_WEIGHTS.Job, ...DEFAULT_WEIGHTS.Customer },
    resultLimit: RESULT_LIMIT.default,
  }
}

export function draftFromCampaign(c: {
  profileId: string
  mode: OpportunityMode
  name: string
  goal: string
  criteria: Partial<CampaignCriteria>
  weights: Record<string, number>
  resultLimit: number
}): CampaignDraft {
  const mode: SupportedMode = isSupportedMode(c.mode) ? c.mode : 'Job'
  return {
    profileId: c.profileId,
    mode,
    name: c.name,
    goal: c.goal ?? '',
    criteria: { ...emptyCriteria(), ...criteriaForMode(mode, c.criteria) },
    weights: { ...DEFAULT_WEIGHTS.Job, ...DEFAULT_WEIGHTS.Customer, ...weightsForMode(mode, c.weights) },
    resultLimit: c.resultLimit,
  }
}

/** The body the API receives: trimmed text, only this mode's criteria and weights. */
export function campaignPayload(draft: CampaignDraft, mode: SupportedMode) {
  return {
    name: draft.name.trim(),
    goal: draft.goal.trim(),
    criteria: criteriaForMode(mode, draft.criteria),
    weights: weightsForMode(mode, draft.weights),
    resultLimit: draft.resultLimit,
  }
}

/** Why the draft cannot be saved yet, in words the disabled Save button can show. Empty when it can. */
export function draftProblems(draft: CampaignDraft, profileId: string): string[] {
  const problems: string[] = []
  if (!profileId) problems.push('Choose a profile.')
  if (!draft.name.trim()) problems.push('Give the campaign a name.')
  if (draft.name.trim().length > NAME_MAX) problems.push(`Shorten the name to ${NAME_MAX} characters.`)
  if (draft.goal.trim().length > GOAL_MAX) problems.push(`Shorten the goal to ${GOAL_MAX} characters.`)
  if (!Number.isInteger(draft.resultLimit) || draft.resultLimit < RESULT_LIMIT.min || draft.resultLimit > RESULT_LIMIT.max)
    problems.push(`Set the result limit to a whole number from ${RESULT_LIMIT.min} to ${RESULT_LIMIT.max}.`)
  const years = draft.criteria.candidateYears
  if (years !== null && (!Number.isFinite(years) || years < 0 || years > YEARS_MAX))
    problems.push(`Set your years of experience between 0 and ${YEARS_MAX}, or leave it empty.`)
  return problems
}
