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
