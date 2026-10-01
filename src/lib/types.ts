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

export type CapabilityStatus = 'Ready' | 'Configured' | 'NotConfigured' | 'Disabled' | 'ManualHandoff' | 'NotBuilt'

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
  items: Capability[]
}

export interface Overview {
  profiles: number
}
