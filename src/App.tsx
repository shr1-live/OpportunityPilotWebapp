import { useState } from 'react'
import { createBrowserRouter, Link, Navigate, RouterProvider, useLocation, useNavigate } from 'react-router-dom'
import { ApplicationsPage } from './features/applications/ApplicationsPage'
import { ApprovalQueuePage } from './features/approvals/ApprovalQueuePage'
import { AuthProvider, useAuth } from './features/auth/AuthProvider'
import { authScreenFor, isAuthOnlyPath, ONBOARDED_KEY, readFlag } from './features/auth/authModel'
import { OnboardingPage } from './features/auth/OnboardingPage'
import { NewPasswordPage, ResetPasswordPage } from './features/auth/ResetPasswordPage'
import { SignInPage } from './features/auth/SignInPage'
import { SignUpPage } from './features/auth/SignUpPage'
import { VerifyEmailPage } from './features/auth/VerifyEmailPage'
import { CampaignBuilder } from './features/campaigns/CampaignBuilder'
import { CampaignsPage } from './features/campaigns/CampaignsPage'
import { IntegrationsPage } from './features/integrations/IntegrationsPage'
import { OpportunitiesPage } from './features/opportunities/OpportunitiesPage'
import { OpportunityDetailPage } from './features/opportunities/OpportunityDetailPage'
import { OverviewPage } from './features/overview/OverviewPage'
import { NotBuiltPage } from './features/placeholder/NotBuiltPage'
import { ProfilesPage } from './features/profiles/ProfilesPage'
import { ResearchProgressPage } from './features/research/ResearchProgressPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { AppShell } from './features/shell/AppShell'

const SIGNED_OUT_SCREENS = {
  signin: SignInPage,
  signup: SignUpPage,
  verify: VerifyEmailPage,
  reset: ResetPasswordPage,
  'new-password': NewPasswordPage,
}

/**
 * Signed-out visitors see an account screen; any non-account URL shows sign-in, so deep links survive sign-in.
 * A password-reset link opens "Choose a new password" first. New browsers see onboarding once.
 */
function AuthGate() {
  const { ready, user, recovering } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [onboarded, setOnboarded] = useState(() => readFlag(ONBOARDED_KEY, false))
  if (!ready) return <div className="boot" role="status">Checking your session…</div>
  if (recovering) return <NewPasswordPage />
  if (!user) {
    const Screen = SIGNED_OUT_SCREENS[authScreenFor(location.pathname)]
    return <Screen />
  }
  if (isAuthOnlyPath(location.pathname)) return <Navigate to="/" replace />
  if (!onboarded)
    return (
      <OnboardingPage
        onDone={(path) => {
          setOnboarded(true)
          navigate(path)
        }}
      />
    )
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

// A data router is required: ProfilesPage and CampaignBuilder use useBlocker to guard unsaved edits.
const router = createBrowserRouter([
  {
    element: <AuthGate />,
    children: [
      { index: true, element: <OverviewPage />, handle: { title: 'Overview' } },
      { path: 'applications', element: <ApplicationsPage />, handle: { title: 'Applications' } },
      { path: 'campaigns', element: <CampaignsPage />, handle: { title: 'Campaigns' } },
      { path: 'campaigns/new', element: <CampaignBuilder />, handle: { title: 'New campaign' } },
      { path: 'campaigns/:id/edit', element: <CampaignBuilder />, handle: { title: 'Campaign builder' } },
      { path: 'campaigns/:id/opportunities', element: <OpportunitiesPage />, handle: { title: 'Opportunities' } },
      { path: 'research/:jobId', element: <ResearchProgressPage />, handle: { title: 'Research run' } },
      { path: 'opportunities', element: <OpportunitiesPage />, handle: { title: 'Opportunities' } },
      { path: 'opportunities/:id', element: <OpportunityDetailPage />, handle: { title: 'Opportunity' } },
      { path: 'approvals', element: <ApprovalQueuePage />, handle: { title: 'Approvals' } },
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
