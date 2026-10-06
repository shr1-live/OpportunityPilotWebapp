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
import { EmptyState } from './components/States'

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
      <EmptyState
        title="There is no page at this address"
        actions={
          <Link className="btn btn-secondary" to="/">
            Go to overview
          </Link>
        }
      >
        The link may be old, or the item may belong to another account.
      </EmptyState>
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
            willDo={[
              'Draft a cover note or email per opportunity from your confirmed profile facts',
              'Bind your approval to one version — editing it clears the approval',
              'Send only approved versions, one at a time, never in bulk',
            ]}
            today={[
              { label: 'Review shortlisted opportunities', to: '/opportunities', primary: true },
              { label: 'Confirm your profile claims', to: '/profiles' },
            ]}
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
            willDo={[
              'Group next actions by due date, in your time zone',
              'Mark delivered only when a provider confirms it',
              'Respect opt-outs before any draft is written',
            ]}
            today={[
              { label: 'See what needs you', to: '/applications', primary: true },
              { label: 'Open approvals', to: '/approvals' },
            ]}
          />
        ),
      },
      {
        path: 'projects',
        handle: { title: 'Projects & tenders' },
        element: (
          <NotBuiltPage
            heading="Projects & tenders"
            milestone="N5 (sales pipeline)"
            description="Open projects and tenders to bid on, with budget, bids so far, the client's record and your fit."
            willDo={[
              'List open projects and public tenders from sources whose terms allow reading them',
              'Score each brief requirement by requirement, with the evidence',
              'Show the competition: bid range, median bid and how many are interviewing',
            ]}
            today={[
              { label: 'Find companies with a Customers campaign', to: '/campaigns/new', primary: true },
              { label: 'Write a Services profile', to: '/profiles/new' },
            ]}
          />
        ),
      },
      {
        path: 'proposals',
        handle: { title: 'Proposals & bids' },
        element: (
          <NotBuiltPage
            heading="Proposals & bids"
            milestone="N5 (sales pipeline)"
            description="Draft a proposal per project: cover letter, rate, timeline and milestones, with every claim's basis listed."
            willDo={[
              'Draft from your confirmed profile facts only — every claim shows its basis',
              'Bind approval to one version; changing the rate clears it',
              'Hand off to the source to submit: copy the final text and open the brief',
            ]}
            today={[
              { label: 'Confirm your profile claims', to: '/profiles', primary: true },
              { label: 'Review shortlisted companies', to: '/opportunities' },
            ]}
          />
        ),
      },
      {
        path: 'bids',
        handle: { title: 'Bids sent' },
        element: (
          <NotBuiltPage
            heading="Bids sent"
            milestone="N5 (sales pipeline)"
            description="Everything submitted and what came back."
            willDo={[
              'Win rate counted on decided bids only',
              'Median reply time, and how many went silent',
              'Broken down by source and budget band',
            ]}
            today={[{ label: 'Open approvals', to: '/approvals', primary: true }]}
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
