# Sales flow — the app as a sales assistant

The Sales team uses the app to find business opportunities (companies with a problem the product solves; later freelance projects and tenders/RFPs), prepare proposals and emails, approve them in a batch, send, and follow up. Today only **Customer**-mode research is built: profile (Product / Business / Services) → Customer campaign → research run → opportunities → shortlist / mark contacted. Everything after that is `not built`.

Template fields per entry: Route, Component, What it shows, Actions, State (reads), State (writes), Navigation out, Validation, Status, TODOs. `Status` is flipped only by `/build-screen`. The campaign builder, research run and opportunity screens are the same components as the Candidate flow; their full entries are in `docs/CANDIDATE_FLOW.md` and only Customer differences are listed here. Contracts: built — `../OpportunityPilotWebApi/docs/RESEARCH_CONTRACT.md`; planned — `../OpportunityPilotWebApi/docs/M4_M5_CONTRACT.md` (API not built). Gap IDs refer to `docs/open-questions.md`.

---

### Campaign builder — Customer specifics (steps 1–4)

- **Route:** `/campaigns/new`, `/campaigns/:id/edit?step=1..4` (same routes as the Job builder)
- **Component:** `src/features/campaigns/CampaignBuilder.tsx`, `GoalStep.tsx`, `FiltersStep.tsx`, `SourcesStep.tsx`, `ReviewStep.tsx`; logic in `campaignModel.ts`
- **What it shows:** Step 1: mode "Customers — Companies with a problem you solve" (suggested automatically for Product, Business and Services profiles); Customer placeholders ("e.g. EU logistics software companies"). Step 2: Search "Product and search words"; hard filters Geography, Exclude keywords, Exclude organisations (no required skills, work modes or years); scored Industries, Problems you solve ("two or more mentions count as a full match"), Published signals ("absence is unknown, not a negative"); weights Industry 25, Problem 30, Geography 15, Published signals 20, Contact path 10 (contact path is always applied). Step 3: paste blocks start with the company name and accept `Website:`; CSV requires `name`, optional `website`, `country`, `industry`, `description`. Step 4: review lists Geography as a hard filter and Industries / Problems / Signals as scored.
- **Actions:** As in `docs/CANDIDATE_FLOW.md` (Campaign builder steps 1–4). Reset to defaults applies the Customer weights.
- **State (reads):** As in the Job builder; `campaign.mode === 'Customer'` switches labels, criteria, weights and CSV columns.
- **State (writes):** `POST /api/v1/campaigns` / `PUT /api/v1/campaigns/:id` with only Customer criteria (`keywords`, `industries`, `problems`, `locations`, `signals`, `excludeKeywords`, `excludeOrganizations`) and Customer weights; sources and research calls as in the Job builder.
- **Navigation out:** As in the Job builder.
- **Validation:** Same rules as the Job builder (`draftProblems`); no years-of-experience field in Customer mode.
- **Status:** built
- **TODOs:** No tender/RFP or Freelancer.com project sources — only Paste, URL, Feed, CSV (OQ-FE-002). Freelance mode disabled until M7 (OQ-FE-032). Discovery provider not built (OQ-FE-021). "Suggest criteria" (M4) not built (OQ-FE-007).

---

### Opportunities — List (Customer)

- **Route:** `/opportunities?campaign=<customer campaign id>`, `/campaigns/:id/opportunities`
- **Component:** `src/features/opportunities/OpportunitiesPage.tsx`
- **What it shows:** Same list as the Job entry in `docs/CANDIDATE_FLOW.md`; rows show the company as title/organisation and mode "Customer"; no platform line. Fit uses the Customer criteria. The page states that bulk sending is not offered.
- **Actions:** Same as the Job list: Shortlist / Dismiss / Remove from shortlist / Restore (`PATCH /api/v1/opportunities/:id/status`), filters, sort, Load more, Refresh, Export CSV, open detail.
- **State (reads):** `GET /api/v1/campaigns`; `GET /api/v1/campaigns/:id/opportunities?outcome&status&sort&take=50&skip`.
- **State (writes):** `PATCH /api/v1/opportunities/:id/status`; `GET /api/v1/campaigns/:id/export` (CSV download).
- **Navigation out:** `/opportunities/:id`, `/research/:jobId`, `/campaigns/new`, `/campaigns/:id/edit?step=4`.
- **Validation:** Same as the Job list.
- **Status:** built
- **TODOs:** No selection of several companies for one outreach batch (OQ-FE-001). Copy "every message is approved individually" conflicts with batch approval (OQ-FE-001).

---

### Opportunity — Detail (Customer)

- **Route:** `/opportunities/:id`
- **Component:** `src/features/opportunities/OpportunityDetailPage.tsx`
- **What it shows:** Same layout as the Job detail in `docs/CANDIDATE_FLOW.md`, with Customer differences: the external link reads "Open website"; "Mark contacted" replaces "Mark applied"; no apply-agent notice; fit contributions are Industry, Problem you solve, Geography, Published signals, Contact path; a missing contact path stays visible as Unknown / a gap.
- **Actions:** Shortlist, Dismiss, Mark contacted (shown when status is not Contacted; no confirm), Set status + Update → `PATCH /api/v1/opportunities/:id/status`. Evidence anchors. Back to the list.
- **State (reads):** `GET /api/v1/opportunities/:id`.
- **State (writes):** `PATCH /api/v1/opportunities/:id/status` `{ status }`.
- **Navigation out:** `/campaigns/:campaignId/opportunities`; the company website (http/https only, new tab).
- **Validation:** Buttons disabled while a change runs; Update disabled when the selected status equals the current one.
- **Status:** built
- **TODOs:** No email/proposal draft section, no AI explanation, no activity logging or next actions (OQ-FE-005, OQ-FE-007, OQ-FE-006). "Mark contacted" is a manual status; M5 replaces it with logged activities (`POST /api/v1/opportunities/{id}/activities`).

---

### Outreach — Inbox and draft editor

- **Route:** `/outreach` (currently renders `NotBuiltPage`, milestone M5; listed in the nav)
- **Component:** today `src/features/placeholder/NotBuiltPage.tsx` via `src/App.tsx:52-62`; planned `src/features/outreach/OutreachPage.tsx` + `outreachModel.ts`
- **What it shows:** Today: "Outreach — Drafts per opportunity. Every version needs your approval before it can be sent." and "Not built yet — milestone M5". Planned (`M4_M5_CONTRACT.md`, design `Outreach.dc.html`, `MobileOutreach.dc.html`): drafts across opportunities (title, organisation, channel, recipient, state, version, updated), channel tabs (Email, LinkedIn message, Contact form), an editor with recipient (verified / unverified), subject, body, claims with their basis, approval state, send blockers, version history, evidence panel.
- **Actions:** Today: Go to profiles → `/profiles`. Planned: open a draft; edit (clears approval); approve the current version; revoke approval; delete; generate a new draft from an opportunity; copy the approved text.
- **State (reads):** Today: none. Planned: `GET /api/v1/drafts?state&take&skip` (`{ total, items: DraftListItem[] }`), `GET /api/v1/drafts/:id` (`Draft`), `GET /api/v1/suppressions`.
- **State (writes):** Today: none. Planned: `POST /api/v1/opportunities/:id/drafts { channel, recipient? }`, `PUT /api/v1/drafts/:id { recipient?, subject?, body, expectedVersion }`, `POST /api/v1/drafts/:id/approve { version }`, `POST /api/v1/drafts/:id/revoke-approval`, `DELETE /api/v1/drafts/:id`.
- **Navigation out:** Today: `/profiles`. Planned: `/opportunities/:id`.
- **Validation:** Planned: Approve disabled when the body is empty, the recipient is suppressed, or an Email draft has no recipient; 409 on a stale version; Send never enabled in M5 (`sendReady` is false: "Sending arrives with Gmail (M6)"); each disabled control shows its `sendBlockers`.
- **Status:** not built
- **TODOs:** API M5 not built (OQ-FE-005). Approval model (per version vs batch) undecided (OQ-FE-001). Gmail sending is M6 (OQ-FE-010). Types `Draft`, `DraftListItem` not in `src/lib/types.ts`.

---

### Follow-ups — Reminders by due date

- **Route:** `/follow-ups` (currently renders `NotBuiltPage`, milestone label M7; listed in the nav)
- **Component:** today `src/features/placeholder/NotBuiltPage.tsx` via `src/App.tsx:63-73`; planned `src/features/follow-ups/FollowUpsPage.tsx` + `followUpModel.ts`
- **What it shows:** Today: "Follow-ups — Reminders grouped by due date, with opt-outs and suppression respected." and "Not built yet — milestone M7". Planned (`M4_M5_CONTRACT.md` next actions, design `FollowUps.dc.html`): open next actions grouped by due date with the time zone stated, overdue marked, opportunity title and organisation; suppression list. Reminders are shown in the app only — nothing is delivered.
- **Actions:** Today: Go to profiles. Planned: mark done / cancel, reschedule, open the opportunity, add/remove a suppression.
- **State (reads):** Today: none. Planned: `GET /api/v1/next-actions?state=Open`, `GET /api/v1/suppressions`.
- **State (writes):** Today: none. Planned: `PATCH /api/v1/next-actions/:id { state?, dueAt? }`, `POST /api/v1/opportunities/:id/next-actions { kind, note, dueAt, timeZone }`, `POST /api/v1/suppressions { recipient, reason }`, `DELETE /api/v1/suppressions/:id`.
- **Navigation out:** Today: `/profiles`. Planned: `/opportunities/:id`.
- **Validation:** Planned: due date required and in the user's stated time zone; suppression recipient required.
- **Status:** not built
- **TODOs:** Milestone label M7 conflicts with the contract's M5 (OQ-FE-006). API not built. Also relevant to Candidate follow-ups once roles exist (OQ-FE-003).

---

### Proposal drafts — Proposals for projects, tenders and companies

- **Route:** none yet
- **Component:** none yet
- **What it shows:** (planned, `../HANDOFF.md` 2026-10-05) A proposal drafted from the opportunity's evidence and the Product/Services profile, with unknowns as `[placeholders]`, claim basis, version and approval state. Upwork proposals are drafted for a human to send (Upwork bans automated submission); tenders need a digital signature and stay manual.
- **Actions:** (planned) generate, edit, approve (batch), copy or hand off.
- **State (reads):** (planned) no contract — `M4_M5_CONTRACT.md` has no Proposal channel.
- **State (writes):** (planned) no contract.
- **Navigation out:** (planned) opportunity detail, outreach inbox.
- **Validation:** (planned) unknown until the contract exists; must never invent figures, contacts or credentials.
- **Status:** not built
- **TODOs:** Write the contract (OQ-FE-002). Decide approval model (OQ-FE-001).

---

### Freelancer.com bids — Find projects and place bids

- **Route:** none yet
- **Component:** none yet
- **What it shows:** (planned) Freelancer.com projects found through the official API, scored like other opportunities, with a prepared bid (amount, delivery time, proposal text) per project.
- **Actions:** (planned) review prepared bids, approve a batch, place approved bids through the Freelancer.com API.
- **State (reads):** (planned) no contract; would need a Freelance campaign mode (disabled until M7) and a Freelancer.com source.
- **State (writes):** (planned) no contract; bid placement happens server-side with a key that never reaches the browser.
- **Navigation out:** (planned) opportunity detail, approval batch.
- **Validation:** (planned) no bid is placed without approval; amounts come from the user, never invented.
- **Status:** not built
- **TODOs:** Contract and API (OQ-FE-002); Freelance mode (OQ-FE-032); approval model (OQ-FE-001); credentials stay in server configuration (`CLAUDE.md` security rules).

---

### Batch approval — Approve outgoing emails and bids in one step

- **Route:** none yet
- **Component:** none yet
- **What it shows:** (planned, product decision 2026-10-05) A list of prepared outgoing items (emails, bids, proposals) with recipient (verified or not), channel, first lines, claims basis and blockers; a count of what "Approve all" will approve.
- **Actions:** (planned) remove items from the batch, open one to edit (editing clears its approval), Approve all.
- **State (reads):** (planned) `GET /api/v1/drafts?state=Draft` exists in the M4/M5 contract; bids and proposals have no contract.
- **State (writes):** (planned) no batch endpoint — the contract only has per-draft `POST /api/v1/drafts/:id/approve { version }`.
- **Navigation out:** (planned) outreach editor, opportunity detail.
- **Validation:** (planned) items with blockers (suppressed recipient, missing Email recipient, empty body, stale version) are excluded and listed with the reason; nothing is sent until Gmail (M6) or the bid API exists.
- **Status:** not built
- **TODOs:** Conflicts with per-version approval in `M4_M5_CONTRACT.md` and current UI copy (OQ-FE-001). Needs a contract (OQ-FE-002).
