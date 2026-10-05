import { createContext, useContext } from 'react'
import type { Capabilities } from '../../lib/types'

export interface ShellState {
  capabilities: Capabilities | undefined
  /** Suggested opportunities waiting in /approvals (from GET /api/v1/overview); undefined until known. */
  awaitingApproval: number | undefined
  /** Re-reads the overview counts, e.g. after an approval decision or a status change. */
  refreshOverview: () => void
}

export const ShellContext = createContext<ShellState>({
  capabilities: undefined,
  awaitingApproval: undefined,
  refreshOverview: () => {},
})

export const useShell = () => useContext(ShellContext)
