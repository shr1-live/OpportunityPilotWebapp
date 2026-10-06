/**
 * "Try a sample run": real requests to the API with a fixed, visible setup, so a new user can watch the whole
 * candidate pipeline (gather → filter → score → suggest) on live public job boards. Nothing here is fake data —
 * the sources are Stripe's public Greenhouse board and Lever's public demo board.
 */

export const SAMPLE_SOURCES = [
  { kind: 'Greenhouse', url: 'stripe', label: 'Greenhouse board "stripe" (Stripe careers)' },
  { kind: 'Lever', url: 'leverdemo', label: 'Lever board "leverdemo" (Lever’s public demo company)' },
] as const

export const SAMPLE_SUGGEST_AT = 60

export function sampleProfile() {
  return {
    type: 'Candidate',
    name: 'Sample — backend engineer',
    data: {
      fields: { offer: 'Backend engineering', skills: 'Java, Go, Python' },
      confirmations: { skills: true },
    },
    confirmed: true,
  }
}

export function sampleCampaign(profileId: string) {
  return {
    profileId,
    mode: 'Job',
    name: 'Sample run — Greenhouse + Lever',
    goal: 'Backend engineering roles (sample run)',
    criteria: {
      keywords: ['software engineer', 'backend engineer'],
      requiredSkills: [],
      preferredSkills: ['Java', 'Go', 'Python'],
      candidateYears: 5,
      locations: ['Remote', 'Bengaluru', 'Dublin', 'Singapore'],
      workModes: [],
      industries: [],
      problems: [],
      signals: [],
      excludeKeywords: ['intern', 'manager'],
      excludeOrganizations: [],
    },
    resultLimit: 50,
    autoSuggestMinScore: SAMPLE_SUGGEST_AT,
  }
}
