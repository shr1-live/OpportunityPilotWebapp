# Screen map

Every route in `src/App.tsx`, plus planned screens that have a flow-doc entry but no route. Status mirrors the flow doc and is changed only by `/build-screen` (or `/resolve-oq` when an OQ changes a route). All signed-in routes render inside `AppShell`.

Last updated: 2026-10-05.

| Route | Component | Flow doc → entry | Status |
|---|---|---|---|
| any URL, signed out | `src/features/auth/SignInPage.tsx` | `docs/SHARED_FLOW.md` → Accounts | built |
| `/signup`, `/verify`, `/reset`, `/reset/new` (signed out) | `src/features/auth/SignUpPage.tsx`, `VerifyEmailPage.tsx`, `ResetPasswordPage.tsx` | `docs/SHARED_FLOW.md` → Accounts | built |
| first signed-in visit | `src/features/auth/OnboardingPage.tsx` | `docs/SHARED_FLOW.md` → Accounts | built |
| (wraps every signed-in route) | `src/features/shell/AppShell.tsx` | `docs/SHARED_FLOW.md` → Shell | built |
| `/` | `src/features/overview/OverviewPage.tsx` | `docs/SHARED_FLOW.md` → Overview | built |
| `/profiles`, `/profiles/new`, `/profiles/:id` | `src/features/profiles/ProfilesPage.tsx` | `docs/SHARED_FLOW.md` → Profiles | built |
| `/integrations` | `src/features/integrations/IntegrationsPage.tsx` | `docs/SHARED_FLOW.md` → Sources & integrations | built |
| `/settings` | `src/features/settings/SettingsPage.tsx` | `docs/SHARED_FLOW.md` → Settings | built |
| `*` | `NotFound` in `src/App.tsx` | `docs/SHARED_FLOW.md` → Not found | built |
| `/campaigns` | `src/features/campaigns/CampaignsPage.tsx` | `docs/CANDIDATE_FLOW.md` → Campaigns — List | built |
| `/campaigns/new`, `/campaigns/:id/edit` (`?step=1`) | `src/features/campaigns/CampaignBuilder.tsx` + `GoalStep.tsx` | `docs/CANDIDATE_FLOW.md` → Step 1; Customer: `docs/SALES_FLOW.md` → Customer specifics | built |
| `…?step=2` | `CampaignBuilder.tsx` + `FiltersStep.tsx` | `docs/CANDIDATE_FLOW.md` → Step 2; `docs/SALES_FLOW.md` → Customer specifics | built |
| `/campaigns/:id/edit?step=3` | `CampaignBuilder.tsx` + `SourcesStep.tsx` (+ `JobBoardSources.tsx`) | `docs/CANDIDATE_FLOW.md` → Step 3; `docs/SALES_FLOW.md` → Customer specifics | built |
| `/campaigns/:id/edit?step=4` | `CampaignBuilder.tsx` + `ReviewStep.tsx` | `docs/CANDIDATE_FLOW.md` → Step 4; `docs/SALES_FLOW.md` → Customer specifics | built |
| `/research/:jobId` | `src/features/research/ResearchProgressPage.tsx` | `docs/CANDIDATE_FLOW.md` → Research run — Progress | built |
| `/opportunities`, `/campaigns/:id/opportunities` | `src/features/opportunities/OpportunitiesPage.tsx` | `docs/CANDIDATE_FLOW.md` → Opportunities — List (Job); `docs/SALES_FLOW.md` → Opportunities — List (Customer) | built |
| `/opportunities/:id` | `src/features/opportunities/OpportunityDetailPage.tsx` | `docs/CANDIDATE_FLOW.md` → Opportunity — Detail (Job); `docs/SALES_FLOW.md` → Opportunity — Detail (Customer) | built |
| `/approvals` | `src/features/approvals/ApprovalQueuePage.tsx` | `docs/CANDIDATE_FLOW.md` → Approval queue | built — against the phase-1 contract, API not verified (OQ-FE-033) |
| `/applications` | `src/features/applications/ApplicationsPage.tsx` (+ `AgentSetup.tsx`, `HowItWorks.tsx`) | `docs/CANDIDATE_FLOW.md` → Applications | built |
| `/outreach` | `src/features/placeholder/NotBuiltPage.tsx` (M5 placeholder) | `docs/SALES_FLOW.md` → Outreach — Inbox and draft editor | not built |
| `/follow-ups` | `src/features/placeholder/NotBuiltPage.tsx` (M7 placeholder) | `docs/SALES_FLOW.md` → Follow-ups | not built |
| — (section of `/opportunities/:id`) | — | `docs/CANDIDATE_FLOW.md` → Cover notes | not built |
| — (no route) | — | `docs/SALES_FLOW.md` → Proposal drafts | not built |
| — (no route) | — | `docs/SALES_FLOW.md` → Freelancer.com bids | not built |
| — (no route) | — | `docs/SALES_FLOW.md` → Batch approval | not built |

Navigation rail order (`NAV` in `src/features/shell/AppShell.tsx`): Overview, Applications, Campaigns, Opportunities, Approvals (count badge from `overview.awaitingApproval`), Outreach, Follow-ups, Profiles, Sources & integrations, Settings. Outreach and Follow-ups lead to placeholders (OQ-FE-005, OQ-FE-006).
