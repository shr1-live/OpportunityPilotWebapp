import { createContext, useContext } from 'react'
import type { Capabilities } from '../../lib/types'

export interface ShellState {
  capabilities: Capabilities | undefined
}

export const ShellContext = createContext<ShellState>({ capabilities: undefined })

export const useShell = () => useContext(ShellContext)
