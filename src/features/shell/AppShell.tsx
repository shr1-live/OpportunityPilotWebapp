import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useMatches } from 'react-router-dom'
import { api, ApiUnreachableError } from '../../lib/api'
import type { Capabilities } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { useAuth } from '../auth/AuthProvider'
import { ShellContext } from './ShellContext'

const NAV = [
  { to: '/', label: 'Overview', end: true },
  { to: '/campaigns', label: 'Campaigns' },
  { to: '/opportunities', label: 'Opportunities' },
  { to: '/outreach', label: 'Outreach' },
  { to: '/follow-ups', label: 'Follow-ups' },
  { to: '/profiles', label: 'Profiles' },
  { to: '/integrations', label: 'Sources & integrations' },
  { to: '/settings', label: 'Settings' },
]

type ApiStatus = 'checking' | 'waking' | 'ready' | 'degraded'

/** Polls readiness with backoff so a sleeping free-tier host reads as "starting", not as a failure. */
function useApiStatus(): ApiStatus {
  const [status, setStatus] = useState<ApiStatus>('checking')
  useEffect(() => {
    let cancelled = false
    let attempt = 0
    let timer: ReturnType<typeof setTimeout>
    const check = async () => {
      try {
        await api('/health/ready')
        if (!cancelled) setStatus('ready')
      } catch (e) {
        if (cancelled) return
        setStatus(e instanceof ApiUnreachableError ? 'waking' : 'degraded')
        if (attempt++ < 8) timer = setTimeout(check, Math.min(2000 * 2 ** attempt, 20000))
      }
    }
    void check()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])
  return status
}

function initials(email: string) {
  const name = email.split('@')[0]
  const parts = name.split(/[._\s-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase()
}

export function AppShell() {
  const { user, signOut } = useAuth()
  const apiStatus = useApiStatus()
  // Capabilities need no database, so they also explain a degraded API (e.g. missing setup).
  const capabilities = useApi<Capabilities>(apiStatus === 'ready' || apiStatus === 'degraded' ? '/api/v1/capabilities' : null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const matches = useMatches()
  const title =
    [...matches].reverse().map((m) => (m.handle as { title?: string } | undefined)?.title).find(Boolean) ??
    'OpportunityPilot'

  useEffect(() => {
    setDrawerOpen(false)
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.title = `${title} · OpportunityPilot`
  }, [title])

  useEffect(() => {
    if (!menuOpen && !drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        setDrawerOpen(false)
      }
    }
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [menuOpen, drawerOpen])

  const caps = capabilities.data
  const gemini = caps?.items.find((i) => i.key === 'gemini')
  const gmail = caps?.items.find((i) => i.key === 'gmail')

  const apiLabel: Record<ApiStatus, { text: string; dot: string }> = {
    checking: { text: 'API · checking', dot: 'dot-neutral' },
    waking: { text: 'API · starting', dot: 'dot-warning' },
    ready: { text: 'API · online', dot: 'dot-success' },
    degraded: { text: 'API · database unavailable', dot: 'dot-danger' },
  }

  return (
    <ShellContext.Provider value={{ capabilities: caps }}>
      <div className="shell">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <nav className={`rail ${drawerOpen ? 'rail-open' : ''}`} aria-label="Primary" id="primary-nav">
          <div className="rail-brand">OpportunityPilot</div>
          <ul className="rail-list">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} end={n.end} className="rail-link">
                  {n.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="rail-footer">
            <div className="rail-status">
              <span className={`dot ${apiLabel[apiStatus].dot}`} aria-hidden="true" />
              {apiLabel[apiStatus].text}
            </div>
            {gmail && (
              <div className="rail-status">
                <span className={`dot ${gmail.status === 'Disabled' ? 'dot-neutral' : 'dot-warning'}`} aria-hidden="true" />
                Gmail · {gmail.status === 'Disabled' ? 'disabled' : 'not connected'}
              </div>
            )}
          </div>
        </nav>
        {drawerOpen && <div className="scrim" onClick={() => setDrawerOpen(false)} aria-hidden="true" />}

        <div className="main-col">
          <header className="topbar">
            <button
              type="button"
              className="btn btn-secondary btn-sm menu-toggle"
              aria-controls="primary-nav"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen((o) => !o)}
            >
              Menu
            </button>
            <h1 className="topbar-title">{title}</h1>
            <div className="grow" />
            {gemini && (
              <span className={`pill ${gemini.status === 'Configured' ? 'pill-primary' : 'pill-neutral'}`}>
                <span className="dot" aria-hidden="true" />
                {gemini.status === 'Configured' ? 'Gemini key set · unverified' : 'Rules mode · no AI key'}
              </span>
            )}
            <div className="account" ref={menuRef}>
              <button
                type="button"
                className="avatar"
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((o) => !o)}
              >
                {user ? initials(user.email) : '?'}
              </button>
              {menuOpen && (
                <div className="menu" role="menu">
                  <div className="menu-meta">{user?.email}</div>
                  <button type="button" role="menuitem" className="menu-item" onClick={() => void signOut()}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </header>

          {apiStatus === 'waking' && (
            <div className="banner" role="status">
              <strong>Starting the API service…</strong> The host sleeps when idle; the first request can take up to a
              minute.
            </div>
          )}
          {(caps?.temporaryStorage || caps?.guestSignIn) && (
            <div className="banner" role="status">
              <strong>Demo mode.</strong>{' '}
              {caps.temporaryStorage
                ? 'Your data is temporary and is cleared when the server restarts.'
                : 'Data is stored, but sign-in is guest-only.'}{' '}
              {caps.guestSignIn && 'You are signed in as a private guest.'}
            </div>
          )}
          {apiStatus === 'degraded' && (
            <div className="banner banner-danger" role="alert">
              The API is running but reports its database as unavailable. Data screens will fail until it recovers.
            </div>
          )}

          <main id="main" className="content" tabIndex={-1}>
            <Outlet />
          </main>
        </div>
      </div>
    </ShellContext.Provider>
  )
}
