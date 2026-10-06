// Mirrors the API DTOs in OpportunityPilotWebApi (src/OpportunityPilot.Application).

export type ProfileType = 'Product' | 'Business' | 'Candidate' | 'Services'

export interface ProfileData {
  fields: Record<string, string>
  confirmations: Record<string, boolean>
}

export interface ProfileSummary {
  id: string
  type: ProfileType
  name: string
  version: number
  confirmedAt: string | null
  updatedAt: string
}

export interface Profile extends ProfileSummary {
  data: Partial<ProfileData>
  createdAt: string
}

export type CapabilityStatus =
  | 'Ready'
  | 'Configured'
  | 'NotConfigured'
  | 'Disabled'
  | 'ManualHandoff'
  | 'NotBuilt'
  | 'LocalAgent'

export interface Capability {
  key: string
  name: string
  category: string
  status: CapabilityStatus
  detail: string
  can: string[]
  cannot: string[]
}

/** Capability keys for the open job sources (CANDIDATE_PHASE1_CONTRACT.md §1), category "Sources". */
export type SourceCapabilityKey =
  | 'greenhouse'
  | 'lever'
  | 'adzuna'
  | 'ashby'
  | 'smartrecruiters'
  | 'recruitee'
  | 'workable'
  | 'remotive'
  | 'remoteok'

export interface Capabilities {
  environment: string
  databaseProvider: string
  aiMode: string
  /** Missing server configuration in plain words; empty when setup is complete. */
  setupRequired: string[]
  /** Demo mode: no sign-in provider, visitors continue as random guests. */
  guestSignIn: boolean
  /** Demo mode: no database, data is kept in memory until the server restarts. */
  temporaryStorage: boolean
  items: Capability[]
}

export interface Overview {
  profiles: number
  applied: number
  needsManual: number
  campaigns: number
  shortlisted: number
  /** Opportunities in status Suggested, waiting in the approval queue. */
  awaitingApproval: number
}

export type ApplicationPlatform = 'LinkedIn' | 'Naukri' | 'Instahyre'

/** DryRun: the form was filled but not submitted. NeedsManual: a question the saved answers do not cover. */
export type ApplicationStatus = 'Applied' | 'DryRun' | 'NeedsManual' | 'Skipped' | 'Failed'

export interface ApplicationItem {
  id: string
  platform: ApplicationPlatform
  externalJobId: string
  jobUrl: string
  title: string
  company: string
  location: string | null
  status: ApplicationStatus
  detail: string | null
  occurredAt: string
  updatedAt: string
}

export interface ApplicationPage {
  total: number
  items: ApplicationItem[]
}

export interface ApplicationSummary {
  applied: number
  appliedLast7Days: number
  needsManual: number
  dryRun: number
  skipped: number
  failed: number
  lastActivityAt: string | null
}

export interface AgentKey {
  id: string
  name: string
  /** First characters of the key, enough to recognise it. The full key is never returned again. */
  prefix: string
  createdAt: string
  lastUsedAt: string | null
}

/** Returned once, on creation only. */
export interface CreatedAgentKey extends AgentKey {
  key: string
}

// ---------- Research (docs/RESEARCH_CONTRACT.md in OpportunityPilotWebApi) ----------

/** Only Job and Customer are accepted by the API until M7. */
export type OpportunityMode = 'Customer' | 'Partner' | 'Investor' | 'Job' | 'Freelance'
/** Greenhouse, Lever and Adzuna are Job-campaign sources (CANDIDATE_PHASE1_CONTRACT.md); Customer campaigns reject them. */
export type SourceKind =
  | 'Paste'
  | 'Csv'
  | 'Url'
  | 'Feed'
  | 'Agent'
  | 'Greenhouse'
  | 'Lever'
  | 'Adzuna'
  | 'Ashby'
  | 'SmartRecruiters'
  | 'Recruitee'
  | 'Workable'
  | 'Remotive'
  | 'RemoteOk'
export type SourceStatus = 'Pending' | 'Ok' | 'Failed' | 'Skipped'
export type ResearchJobState = 'Queued' | 'Running' | 'Completed' | 'CompletedWithGaps' | 'Failed' | 'Cancelled'
export type ResearchStage = 'Prepare' | 'Gather' | 'Extract' | 'Filter' | 'Score' | 'Complete'
export type FilterOutcome = 'Qualified' | 'NeedsVerification' | 'Excluded'
/** Suggested: research put it in the approval queue (score ≥ the campaign's autoSuggestMinScore). */
export type OpportunityStatus =
  | 'New'
  | 'Suggested'
  | 'Shortlisted'
  | 'Dismissed'
  | 'Applied'
  | 'Contacted'
  | 'Responded'
  | 'Interested'
  | 'Closed'
export type JobPlatform =
  | 'LinkedIn'
  | 'Naukri'
  | 'Other'
  | 'Greenhouse'
  | 'Lever'
  | 'Adzuna'
  | 'Ashby'
  | 'SmartRecruiters'
  | 'Recruitee'
  | 'Workable'
  | 'Remotive'
  | 'RemoteOk'
export type EventLevel = 'Info' | 'Warning' | 'Error'
export type WorkMode = 'Remote' | 'Hybrid' | 'Onsite'

/** Every list may be empty, which means "not applied". */
export interface CampaignCriteria {
  keywords: string[]
  requiredSkills: string[]
  preferredSkills: string[]
  candidateYears: number | null
  locations: string[]
  workModes: WorkMode[]
  industries: string[]
  problems: string[]
  signals: string[]
  excludeKeywords: string[]
  excludeOrganizations: string[]
  /** Job only: exclude postings that read like a staffing agency. No agency signal never counts against a job. */
  excludeStaffingAgencies: boolean
  /** Job only: exclude postings older than this many days (1–365); null = off. Unknown dates are kept. */
  maxPostingAgeDays: number | null
}

export interface ResearchJobRef {
  id: string
  state: ResearchJobState
  stage: ResearchStage
  finishedAt: string | null
}

export interface CampaignSummary {
  id: string
  profileId: string
  mode: OpportunityMode
  name: string
  goal: string
  resultLimit: number
  /** 1–100: qualified Job opportunities scoring at least this become Suggested after a run. null = off. */
  autoSuggestMinScore: number | null
  version: number
  createdAt: string
  updatedAt: string
  sourceCount: number
  opportunityCount: number
  lastJob: ResearchJobRef | null
}

export interface Campaign extends CampaignSummary {
  criteria: CampaignCriteria
  /** Criterion key → weight. The server normalises them to sum 100. */
  weights: Record<string, number>
}

export interface Source {
  id: string
  campaignId: string
  kind: SourceKind
  label: string
  url: string | null
  platform: JobPlatform | null
  permissionNote: string | null
  status: SourceStatus
  lastFetchedAt: string | null
  safeError: string | null
  itemCount: number
  textLength: number
  createdAt: string
}

export interface ImportPreviewRow {
  row: number
  values: Record<string, string>
  errors: string[]
}

export interface ImportPreview {
  importId: string
  columns: string[]
  warnings: string[]
  /** The first 50 rows only. */
  rows: ImportPreviewRow[]
  validCount: number
  errorCount: number
}

export interface ResearchCounts {
  sources: number
  sourcesDone: number
  sourcesFailed: number
  fetched: number
  candidates: number
  qualified: number
  needsVerification: number
  excluded: number
}

export interface ResearchEvent {
  at: string
  stage: ResearchStage
  level: EventLevel
  message: string
}

export interface ResearchJob {
  id: string
  campaignId: string
  state: ResearchJobState
  stage: ResearchStage
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  safeError: string | null
  counts: ResearchCounts
  /** Latest 100, newest first. Omitted from job lists. */
  events?: ResearchEvent[]
}

export interface OpportunitySummary {
  id: string
  campaignId: string
  mode: OpportunityMode
  title: string
  organization: string
  location: string | null
  url: string | null
  applyUrl: string | null
  platform: JobPlatform | null
  score: number
  coverage: number
  outcome: FilterOutcome
  outcomeReason: string | null
  status: OpportunityStatus
  gapsCount: number
  updatedAt: string
}

export interface OpportunityPage {
  total: number
  items: OpportunitySummary[]
}

/** 1 met, 0.5 partly, 0 not met, null unknown (contributes 0 but stays in the score). */
export type CriterionValue = 1 | 0.5 | 0 | null

export interface FitContribution {
  criterion: string
  label: string
  weight: number
  value: CriterionValue
  points: number
  reason: string
  evidenceIds: string[]
  /** The sentence (or structured-field note) that justified the verdict; null when Unknown. */
  excerpt?: string | null
}

export interface OpportunityFact {
  key: string
  label: string
  value: string
  evidenceId: string | null
  isInference: boolean
}

export interface Evidence {
  id: string
  sourceId: string
  sourceLabel: string
  url: string | null
  retrievedAt: string
  excerpt: string
  extractionMethod: string
}

export interface OpportunityActivity {
  kind: string
  occurredAt: string
  detail: string
}

export interface OpportunityDetail extends OpportunitySummary {
  description: string | null
  version: number
  breakdown: FitContribution[]
  facts: OpportunityFact[]
  gaps: string[]
  evidence: Evidence[]
  activities: OpportunityActivity[]
}

// ---------- Outreach drafts (OpportunityPilotWebApi/docs/M4_M5_CONTRACT.md) ----------

export type DraftChannel = 'Email' | 'CoverNote' | 'LinkedInMessage' | 'ContactForm'
export type DraftState = 'Draft' | 'Approved'
export type DraftSource = 'Gemini' | 'Template'

export interface DraftClaim {
  text: string
  basis: 'Profile' | 'Evidence'
  evidenceId: string | null
}

export interface OutreachDraft {
  id: string
  opportunityId: string
  channel: DraftChannel
  recipient: string | null
  recipientVerified: boolean
  subject: string | null
  body: string
  version: number
  state: DraftState
  approvedVersion: number | null
  approvedAt: string | null
  source: DraftSource
  fallbackReason: string | null
  claims: DraftClaim[]
  sendReady: boolean
  sendBlockers: string[]
  createdAt: string
  updatedAt: string
}

// ---------- Sales pipeline (OpportunityPilotWebApi/docs/SALES_CONTRACT.md) ----------

export type SalesProjectSource = 'Freelancer' | 'TenderFeed' | 'PublicUrl' | 'Manual'
export type SalesProjectState = 'New' | 'Shortlisted' | 'BidPrepared' | 'BidApproved' | 'BidPlaced' | 'ManualHandoff' | 'Dismissed'
export type SalesBidState = 'Draft' | 'Approved' | 'Placed' | 'Failed'

export interface SalesBid {
  id: string
  projectId: string
  amount: number
  currency: string
  deliveryDays: number
  proposal: string
  version: number
  state: SalesBidState
  approvedVersion: number | null
  approvedAt: string | null
  hasValidApproval: boolean
  createdAt: string
  updatedAt: string
}

export interface SalesProject {
  id: string
  source: SalesProjectSource
  externalId: string | null
  title: string
  buyer: string | null
  description: string | null
  url: string | null
  deadlineUtc: string | null
  state: SalesProjectState
  version: number
  bids: SalesBid[]
  createdAt: string
  updatedAt: string
}

// ---------- Approval queue (docs/CANDIDATE_PHASE1_CONTRACT.md §2 in OpportunityPilotWebApi) ----------

/** Agent: the local agent applies (LinkedIn / Naukri). You: the user opens applyUrl and applies. */
export type AppliesVia = 'Agent' | 'You'

export interface ApprovalItem {
  opportunityId: string
  campaignId: string
  campaignName: string
  title: string
  organization: string
  location: string | null
  platform: JobPlatform | null
  applyUrl: string | null
  score: number
  coverage: number
  outcomeReason: string | null
  appliesVia: AppliesVia
}

/** GET /api/v1/approvals — Suggested opportunities, highest score first. */
export interface ApprovalPage {
  total: number
  items: ApprovalItem[]
}

/** POST /api/v1/approvals/decide — at most 200 ids in total, no id in both lists. */
export interface DecideRequest {
  approve: string[]
  reject: string[]
}

/** Ids not owned or no longer Suggested are counted as skipped, not errors. */
export interface DecideResult {
  approved: number
  rejected: number
  skipped: number
}

/** GET /api/v1/analytics/overview?workspace=Candidate|Sales&days=30 (OpportunityPilotWebApi/docs/ANALYTICS_CONTRACT.md). */
export type AnalyticsWorkspace = 'Candidate' | 'Sales'

export interface AnalyticsOverview {
  workspace: AnalyticsWorkspace
  days: number
  generatedAt: string
  campaignCount: number
  kpis: {
    found: number
    qualified: number
    qualifyRate: number | null
    awaitingApproval: number
    shortlisted: number
    shortlistedNotApplied: number
    applied: number | null
    appliedByAgent: number | null
    appliedByYou: number | null
    contacted: number | null
    responded: number | null
    respondedRate: number | null
    agentNeedsYou: number
  }
  funnel: { key: string; label: string; count: number | null; note: string }[]
  fitHistogram: { bands: { from: number; to: number; count: number }[]; threshold: number | null; aboveThreshold: number | null }
  unknownCriteria: { criterion: string; label: string; unknownCount: number }[]
  sources: {
    sourceId: string
    campaignId: string
    label: string
    kind: string
    platform: string | null
    read: number
    qualified: number
    rate: number | null
    lastFetchedAt: string | null
    failing: boolean
  }[]
  applicationsPerDay: { date: string; applied: number; replies: number }[] | null
  attention: { kind: 'Approvals' | 'ShortlistedNotApplied' | 'AgentNeedsYou' | 'SourceFailing'; count: number; detail: string }[]
  activeResearch: {
    jobId: string
    campaignId: string
    campaignName: string
    state: string
    stage: string
    counts: { candidates: number; sources: number; sourcesDone: number }
  } | null
  qualifiedByIndustry: { industry: string; count: number }[] | null
  signalsFound: { signal: string; count: number }[] | null
}
