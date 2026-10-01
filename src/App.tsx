import { createBrowserRouter, Link, RouterProvider } from 'react-router-dom'
import { ApplicationsPage } from './features/applications/ApplicationsPage'
import { AuthProvider, useAuth } from './features/auth/AuthProvider'
import { SignInPage } from './features/auth/SignInPage'
import { IntegrationsPage } from './features/integrations/IntegrationsPage'
import { OverviewPage } from './features/overview/OverviewPage'
import { NotBuiltPage } from './features/placeholder/NotBuiltPage'
import { ProfilesPage } from './features/profiles/ProfilesPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { AppShell } from './features/shell/AppShell'

/** Signed-out users see the sign-in screen at whatever URL they opened, so deep links survive sign-in. */
function AuthGate() {
  const { ready, user } = useAuth()
  if (!ready) return <div className="boot" role="status">Checking your session…</div>
  if (!user) return <SignInPage />
  return <AppShell />
}

function NotFound() {
  return (
    <div className="page">
      <div className="empty">
        <div className="empty-title">There is no page at this address</div>
        <Link className="btn btn-secondary" to="/">
          Go to overview
        </Link>
      </div>
    </div>
  )
}

// A data router is required: ProfilesPage uses useBlocker to guard unsaved edits.
const router = createBrowserRouter([
  {
    element: <AuthGate />,
    children: [
      { index: true, element: <OverviewPage />, handle: { title: 'Overview' } },
      { path: 'applications', element: <ApplicationsPage />, handle: { title: 'Applications' } },
      {
        path: 'campaigns',
        handle: { title: 'Campaigns' },
        element: (
          <NotBuiltPage
            heading="Campaigns"
            milestone="M2"
            description="Describe a goal, confirm the parsed criteria and sources, then queue a research run."
          />
        ),
      },
      {
        path: 'opportunities',
        handle: { title: 'Opportunities' },
        element: (
          <NotBuiltPage
            heading="Opportunities"
            milestone="M3"
            description="Matches from research runs, each with its fit score and the evidence behind it."
          />
        ),
      },
      {
        path: 'outreach',
        handle: { title: 'Outreach' },
        element: (
          <NotBuiltPage
            heading="Outreach"
            milestone="M5"
            description="Drafts per opportunity. Every version needs your approval before it can be sent."
          />
        ),
      },
      {
        path: 'follow-ups',
        handle: { title: 'Follow-ups' },
        element: (
          <NotBuiltPage
            heading="Follow-ups"
            milestone="M7"
            description="Reminders grouped by due date, with opt-outs and suppression respected."
          />
        ),
      },
      { path: 'profiles', element: <ProfilesPage />, handle: { title: 'Profiles' } },
      { path: 'profiles/:id', element: <ProfilesPage />, handle: { title: 'Profiles' } },
      { path: 'integrations', element: <IntegrationsPage />, handle: { title: 'Sources & integrations' } },
      { path: 'settings', element: <SettingsPage />, handle: { title: 'Settings' } },
      { path: '*', element: <NotFound />, handle: { title: 'Not found' } },
    ],
  },
])

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
