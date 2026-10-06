/**
 * Inline SVG line icons from design v2 (`../opportunitypilot-ui/ShellStates.dc.html`).
 * Decorative only: always next to a visible or `.sr-only` text label (or inside a control with an
 * `aria-label`), so they are `aria-hidden`. They draw with `currentColor`, following their container.
 */

import type { ReactNode } from 'react'

export type IconName =
  | 'overview'
  | 'campaigns'
  | 'opportunities'
  | 'approvals'
  | 'applications'
  | 'outreach'
  | 'followUps'
  | 'profiles'
  | 'integrations'
  | 'settings'
  | 'menu'
  | 'candidate'
  | 'sales'
  | 'chevronDown'
  | 'alert'

const PATHS: Record<IconName, ReactNode> = {
  overview: (
    <>
      <rect x="3" y="3" width="7.6" height="7.6" rx="1.6" />
      <rect x="13.4" y="3" width="7.6" height="7.6" rx="1.6" />
      <rect x="3" y="13.4" width="7.6" height="7.6" rx="1.6" />
      <rect x="13.4" y="13.4" width="7.6" height="7.6" rx="1.6" />
    </>
  ),
  campaigns: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" />
    </>
  ),
  opportunities: (
    <>
      <path d="M9 6h12M9 12h12M9 18h12" />
      <circle cx="4.2" cy="6" r="1.3" />
      <circle cx="4.2" cy="12" r="1.3" />
      <circle cx="4.2" cy="18" r="1.3" />
    </>
  ),
  approvals: <path d="M4 12.5 9.5 18 20 6.5" />,
  applications: (
    <>
      <path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z" />
      <path d="M13.5 3v5.5H19" />
      <path d="M8.5 13.5h7M8.5 17h4" />
    </>
  ),
  outreach: (
    <>
      <path d="M21.5 2.5 10.8 13.2" />
      <path d="M21.5 2.5 14.7 21.5l-3.9-8.3-8.3-3.9z" />
    </>
  ),
  followUps: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.2l3.4 2" />
    </>
  ),
  profiles: (
    <>
      <circle cx="12" cy="8" r="3.7" />
      <path d="M4.8 20.4c0-4 3.3-6.5 7.2-6.5s7.2 2.5 7.2 6.5" />
    </>
  ),
  integrations: (
    <>
      <path d="M4 6.4c0-1.6 3.6-2.8 8-2.8s8 1.2 8 2.8-3.6 2.8-8 2.8-8-1.2-8-2.8z" />
      <path d="M4 6.4V12c0 1.6 3.6 2.8 8 2.8s8-1.2 8-2.8V6.4" />
      <path d="M4 12v5.6c0 1.6 3.6 2.8 8 2.8s8-1.2 8-2.8V12" />
    </>
  ),
  settings: (
    <>
      <path d="M3.5 7h9M16.5 7h4M3.5 12h4M11 12h9.5M3.5 17h9M16.5 17h4" />
      <circle cx="14.5" cy="7" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="14.5" cy="17" r="2" />
    </>
  ),
  menu: <path d="M4 6.5h16M4 12h16M4 17.5h16" />,
  candidate: (
    <>
      <circle cx="12" cy="8" r="3.7" />
      <path d="M4.8 20.4c0-4 3.3-6.5 7.2-6.5s7.2 2.5 7.2 6.5" />
    </>
  ),
  sales: (
    <>
      <path d="M4 21V6.5l7-3v17.5" />
      <path d="M11 10.5h9V21" />
      <path d="M14.5 14h2.5M14.5 17.5h2.5M7 9.5h1M7 13h1M7 16.5h1" />
    </>
  ),
  chevronDown: <path d="m6 9 6 6 6-6" />,
  alert: (
    <>
      <path d="M12 3.5 2.8 19.5h18.4z" />
      <path d="M12 10v4.2M12 16.9v.1" />
    </>
  ),
}

interface IconProps {
  name: IconName
  /** Rendered width and height in px. */
  size?: number
  className?: string
}

export function Icon({ name, size = 16, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}
