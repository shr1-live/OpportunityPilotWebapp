# Candidate flow — finding and applying to jobs

The Candidate is a job seeker: a **Candidate** profile, **Job**-mode campaigns, research that scores postings, a shortlist, and the local apply agent that applies only to shortlisted LinkedIn/Naukri jobs. Pipeline: profile → campaign → research run → opportunities → shortlist → agent applies → Applications.

Template fields per entry: Route, Component, What it shows, Actions, State (reads), State (writes), Navigation out, Validation, Status, TODOs. `Status` is flipped only by `/build-screen`. Shared screens (sign-in, shell, Overview, Profiles, Integrations, Settings): `docs/SHARED_FLOW.md`. Customer-mode differences of the same components: `docs/SALES_FLOW.md`. API contract for built screens: `../OpportunityPilotWebApi/docs/RESEARCH_CONTRACT.md`. Gap IDs refer to `docs/open-questions.md`.

---

### Campaigns — List

- **Route:** `/campaigns`
- **Component:** `src/features/campaigns/CampaignsPage.tsx`
- **What it shows:** Intro text and "New campaign". Empty state with the four builder steps; if the user has no profile, "Add a profile" instead. Otherwise a table (newest first): campaign name + goal, mode badge (Job / Customer), source count, opportunity count, last run (state badge + finish time, or "Never run"), updated time. Lists campaigns of every mode.
- **Actions:** New campaign → `/campaigns/new`; campaign name → `/campaigns/:id/edit`; source count → `/campaigns/:id/edit?step=3`; opportunity count → `/campaigns/:id/opportunities`; last-run badge → `/research/:jobId`; Add a profile → `/profiles/new`; Try again on error → reload.
- **State (reads):** `GET /api/v1/campaigns` (`CampaignSummary[]`); `GET /api/v1/profiles` (only to know whether any exist).
- **State (writes):** none.
- **Navigation out:** `/campaigns/new`, `/campaigns/:id/edit`, `/campaigns/:id/edit?step=3`, `/campaigns/:id/opportunities`, `/research/:jobId`, `/profiles/new`.
- **Validation:** none (links only). The table scrolls horizontally inside `.table-scroll`.
- **Status:** built
- **TODOs:** No filter by mode or role (OQ-FE-003).

---

### Campaign builder — Step 1 · Goal and mode

- **Route:** `/campaigns/new` (no `step`), `/campaigns/:id/edit` or `?step=1`
- **Component:** `src/features/campaigns/CampaignBuilder.tsx` (shell, stepper, footer, save) + `src/features/campaigns/GoalStep.tsx`; logic in `campaignModel.ts`
- **What it shows:** Header (campaign name or "New campaign", mode badge, version, saved time, "Unsaved changes" / "Saved"). Stepper with four steps; steps 3–4 locked until the campaign is saved. Profile select ("Name (Type)"), with a notice and link when the user has no profiles and a hint when the profile is not confirmed. Mode radio cards: Jobs, Customers (enabled), Partners, Investors, Freelance (disabled, "Not built yet · M7"). Campaign name. Goal textarea with a character counter (stored as a note; it is not parsed). Side panel "Criteria" (entered by you) summarising step 2 with "Enter/Edit criteria".
- **Actions:**
  - Pick profile / mode (new campaign only) → draft updates; with no explicit choice the mode follows the profile type (Candidate → Job, otherwise Customer).
  - Enter / Edit criteria, Continue, stepper step 2 → `?step=2` (no save).
  - Save campaign → `POST /api/v1/campaigns` → `/campaigns/:id/edit` on the same step (replace, focus moves to the step heading). Save version N+1 (existing) → `PUT /api/v1/campaigns/:id`.
  - 409 on save → "saved somewhere else" notice + "Load the latest version (discards your edits)".
  - Leaving with unsaved changes → `window.confirm`; closing the tab → browser warning.
- **State (reads):** `GET /api/v1/campaigns/:id` (`Campaign`, existing only); `GET /api/v1/profiles` (`ProfileSummary[]`); URL `?step=`; local draft (`CampaignDraft`), `saved`, `error`.
- **State (writes):** `POST /api/v1/campaigns` `{ profileId, mode, name, goal, criteria, weights, resultLimit }` (only the mode's criteria and weights, trimmed text); `PUT /api/v1/campaigns/:id` `{ name, goal, criteria, weights, resultLimit, expectedVersion }`; URL `?step=`.
- **Navigation out:** `?step=2`; `/campaigns/:id/edit` after first save; `/profiles/new` (no-profile notice).
- **Validation:** Save disabled while saving, when nothing needs saving (existing campaign unchanged), or when `draftProblems` is non-empty: no profile, blank name, name > 200, goal > 2000, result limit not a whole number 1–100, years of experience outside 0–60. The footer lists the problems. Profile and mode are disabled once saved. Name `maxLength` 200, goal `maxLength` 2000. Continue is always enabled. Server `fieldErrors` for `name`/`goal` shown under the fields.
- **Status:** built
- **TODOs:** "Suggest criteria" from the goal (M4 goal previews) not built (OQ-FE-007). Partner/Investor/Freelance disabled (OQ-FE-032). Goal error text is not linked with `aria-describedby`.

---

### Campaign builder — Step 2 · Filters (Job)

- **Route:** `/campaigns/new?step=2`, `/campaigns/:id/edit?step=2`
- **Component:** `src/features/campaigns/FiltersStep.tsx` (+ `WeightsEditor` in the same file), `src/components/TagInput.tsx`
- **What it shows:** Search: "Job titles and search phrases" (also used by the agent's searches). Hard filters (badge "Hard filter"): Required skills, Locations ("Remote" accepts remote roles), Work modes (Remote / Hybrid / On-site checkboxes), Exclude keywords, Exclude organisations — with the Excluded / Needs verification explanation. Scored criteria: Preferred skills, Your years of experience. Result limit (new opportunities kept per run). Scoring weights table: Required skills, Experience, Location and work mode, Preferred skills — weight 0–100 and a preview of each share of 100 ("Not applied — nothing configured" when the criterion is empty).
- **Actions:** Tag inputs: Enter or comma adds, paste of a comma/line list adds several, × removes (announced). Tick work modes. Edit numbers. Reset to defaults → Job default weights 40/20/20/20. Footer: Back → step 1; Save; "Save and continue" (or Continue when saved and unchanged) → step 3.
- **State (reads):** local draft (criteria, weights, resultLimit); server `fieldErrors` keyed by criterion.
- **State (writes):** local draft only; saving as in step 1 (`POST`/`PUT /api/v1/campaigns…`); URL `?step=3`.
- **Navigation out:** `?step=1`, `?step=3` (after save).
- **Validation:** "Save and continue" disabled while saving or when the draft needs saving and `draftProblems` is non-empty; Save as in step 1. Tags: max 50 per list (input disabled with "Limit of 50 reached"), 100 characters each, case-insensitive duplicates rejected and announced. Years 0–60 (blank skips the criterion). Result limit 1–100 whole number. Weights clamped to 0–100 integers; when every applied weight is 0 a hint warns that every result would score 0 (does not block saving).
- **Status:** built
- **TODOs:** none beyond step 1.

---

### Campaign builder — Step 3 · Sources

- **Route:** `/campaigns/:id/edit?step=3` (saved campaigns only; unsaved drafts are clamped to step 2)
- **Component:** `src/features/campaigns/SourcesStep.tsx` (`PasteForm`, `UrlForm`, `CsvImport` in the same file)
- **What it shows:** "Sources in this campaign" table: label (+ URL, permission note, safe error), kind (+ platform for agent sources), status badge (Not fetched yet / OK / Failed / Skipped), content (characters, items, rows or "Read on each run"), last fetched, Remove. Summary "N sources · N fetched OK · N failed". Empty notice. "Add your own material": kind radio (Paste text, Public URL, RSS / Atom feed, CSV file) and its form. CSV: required/optional columns for Job (`title`, `company`; `location`, `url`, `description`, `id`), preview with valid/error counts, warnings, first 50 rows with per-row errors, label, Import / Discard. "Other sources": discovery provider "Not built yet"; LinkedIn / Naukri "Via your local agent" with a link to Applications.
- **Actions:**
  - Add pasted text → `POST /api/v1/campaigns/:id/sources` `{ kind: 'Paste', label?, text }` → list reloads, announced.
  - Add URL / Add feed → `POST …/sources` `{ kind: 'Url'|'Feed', label?, url, permissionNote? }`.
  - Choose CSV → size check (1 MB) → `POST /api/v1/imports/preview` `{ campaignId, csv }` → preview. Import N valid rows → `POST /api/v1/imports/:importId/commit` `{ label? }`. Discard → clears the preview.
  - Remove → `window.confirm` → `DELETE /api/v1/campaigns/:id/sources/:sourceId` (found opportunities are kept).
  - Applications page link → `/applications`. Footer: Back → step 2; Continue → step 4.
- **State (reads):** `GET /api/v1/campaigns/:id/sources` (`Source[]`); `campaign.mode` for CSV columns and paste placeholders; local form state.
- **State (writes):** the POST/DELETE calls above; the file is read in the browser (`File.text()`) and sent as text.
- **Navigation out:** `?step=2`, `?step=4`, `/applications`.
- **Validation:** Add pasted text disabled while busy or when the text is blank; text `maxLength` 50 000 with a counter. Add URL / feed disabled while busy or URL blank; URL `required`, `type=url`, `maxLength` 1000; label 200; permission note 500. CSV over 1 MB rejected before upload; Import disabled while busy or with 0 valid rows; Discard disabled while busy. Remove disabled for the row being removed. Server `fieldErrors` for `text`/`url` shown under the field.
- **Status:** built
- **TODOs:** Discovery provider hard-coded "Not built yet" (OQ-FE-021). Greenhouse / Lever / Adzuna sources not built (OQ-FE-009).

---

### Campaign builder — Step 4 · Review and run

- **Route:** `/campaigns/:id/edit?step=4`
- **Component:** `src/features/campaigns/ReviewStep.tsx`
- **What it shows:** Review list: Profile (fixed), Mode (fixed), Goal, Criteria (hard filters badged), Result limit, Scoring weights (shares of 100), Sources — each editable item with an Edit link. Source coverage (count, failed last time, discovery provider not built, no workload estimate; max 100 candidates and the result limit). Manual run card with "Queue research run" and an "already queued/running" notice. Scheduled run card ("Schedule setup required", static). Previous runs (latest 5: state, queued time, qualified / to verify / excluded). "View N opportunities" when the campaign has any.
- **Actions:** Edit → step 1/2/3. Queue research run → `POST /api/v1/campaigns/:id/research` → `/research/:jobId` (the API returns the active job instead of a duplicate). "Follow its progress" / previous run → `/research/:jobId`. View opportunities → `/campaigns/:id/opportunities`. Footer: Back → step 3; Save.
- **State (reads):** `GET /api/v1/campaigns/:id/sources`; `GET /api/v1/campaigns/:id/research-jobs` (`ResearchJob[]`, events omitted); draft and saved campaign from the builder.
- **State (writes):** `POST /api/v1/campaigns/:id/research` → `{ jobId }`.
- **Navigation out:** `/research/:jobId`, `/campaigns/:id/opportunities`, `?step=1..3`.
- **Validation:** Queue disabled while queueing or when blocked: unsaved changes ("Save your changes first — a run uses the saved campaign.") or sources loaded and none exist ("Add a source in step 3 first…"); the reason is shown under the button. A ref prevents double submission.
- **Status:** built
- **TODOs:** Scheduling text hard-coded instead of the `scheduler` capability (OQ-FE-020). Discovery provider literal (OQ-FE-021). While sources are still loading the Queue button is not blocked.

---

### Research run — Progress

- **Route:** `/research/:jobId`
- **Component:** `src/features/research/ResearchProgressPage.tsx`; logic in `researchModel.ts` (tested)
- **What it shows:** Campaign name and state badge (Queued, Running, Completed, Completed with gaps, Failed, Cancelled); run ID prefix, queued/started/finished times, time zone. Plain-language state explanation (+ safe error). Polling status line (announced) and last check time. Six stages (Prepare, Gather sources, Extract facts, Filter, Score, Complete) marked done / in progress / not started / stopped, with per-stage counts. Counts: sources processed, items fetched, candidates, qualified (+ to verify, excluded) — no percentage. Event log (latest 100, safe summaries, level badges). Partial results / Results card. Scheduling card (static "Not scheduled"). Link back to the campaign.
- **Actions:** Cancel run (active only) → `window.confirm` → `POST /api/v1/research-jobs/:id/cancel` → polling restarts. View (partial) results / Open list → `/campaigns/:campaignId/opportunities`. Check again (after the 10-minute limit) → restarts polling. Try again on a load error. Back to the campaign → `/campaigns/:id/edit?step=4`.
- **State (reads):** `GET /api/v1/research-jobs/:id` (`ResearchJob` with events) polled every 2 s, backing off ×1.5 to 10 s when unchanged or failing; stops when finished, after 10 minutes, or on 401/403/404; `GET /api/v1/campaigns/:campaignId` for the name.
- **State (writes):** `POST /api/v1/research-jobs/:id/cancel`.
- **Navigation out:** `/campaigns/:campaignId/opportunities`, `/campaigns/:campaignId/edit?step=4`.
- **Validation:** Cancel shown only while Queued/Running; disabled while cancelling or after a cancel was requested ("Cancel requested").
- **Status:** built
- **TODOs:** Scheduling card hard-coded (OQ-FE-020). The host sleeps when idle, so a queued run may wait (explained in the copy, not a defect).

---

### Opportunities — List (Job)

- **Route:** `/opportunities` (campaign from `?campaign=`, default newest) and `/campaigns/:id/opportunities`
- **Component:** `src/features/opportunities/OpportunitiesPage.tsx` (`CampaignOpportunities`, `OpportunityTable`); logic in `opportunityModel.ts` (tested)
- **What it shows:** Campaign select (all modes; "Unknown campaign" for a foreign/unknown id). Per campaign: name, "Latest run" link, Refresh, Export CSV. Filters: Outcome (All, Qualified, Needs verification, Excluded), Status (Any + 8 statuses), Sort (Fit score, Recently updated). Table: title (+ organisation · location), mode (+ LinkedIn/Naukri), "Fit N/100" + coverage %, outcome badge + reason + "N not verified", status badge, updated, quick actions. "Showing N of total · sorted and paged by the server", Load more. Empty states for no campaigns, no opportunities, and no filter matches. Note that bulk sending is not offered.
- **Actions:** Change campaign → `?campaign=` (replace) or `/campaigns/:id/opportunities`. Title → `/opportunities/:id`. Quick actions: New → Shortlist / Dismiss; Shortlisted → Remove from shortlist (→ New) / Dismiss; Dismissed → Restore (→ New); later statuses have none — each `PATCH /api/v1/opportunities/:id/status`, row updated in place and announced. Refresh / filter change → back to page 1. Load more → next page (offset, deduplicated). Export CSV → file download. Latest run → `/research/:jobId`. Empty-state links → `/campaigns/new`, `/campaigns/:id/edit?step=4`.
- **State (reads):** `GET /api/v1/campaigns`; `GET /api/v1/campaigns/:id/opportunities?outcome&status&sort&take=50&skip` (`OpportunityPage`); local filters, appended pages, patched rows.
- **State (writes):** `PATCH /api/v1/opportunities/:id/status` `{ status }`; `GET /api/v1/campaigns/:id/export` (`text/csv`) saved via `saveBlob` with a sanitised file name (`lib/download.ts`); URL `?campaign=`.
- **Navigation out:** `/opportunities/:id`, `/research/:jobId`, `/campaigns/new`, `/campaigns/:id/edit?step=4`, `/campaigns/:id/opportunities`.
- **Validation:** Export disabled while exporting. Quick-action buttons disabled while that row's request runs. Load more shown only while fewer than `total` are loaded; disabled while loading.
- **Status:** built
- **TODOs:** Mobile uses a scrolling table, not the compact cards in `MobileOpportunities.dc.html` (OQ-FE-031). No auto-suggest / approval queue (see Approval queue below, OQ-FE-004).

---

### Opportunity — Detail (Job)

- **Route:** `/opportunities/:id`
- **Component:** `src/features/opportunities/OpportunityDetailPage.tsx`
- **What it shows:** Back link; title, mode and status badges, organisation · location · platform, updated time; "Open posting" and "Open application page" (only http/https, new tab). Pipeline status card: quick buttons, "Set status" select + Update, apply-agent notice when the job is Shortlisted on LinkedIn/Naukri ("…on its next `npm run agent -- apply <platform>` run"). Fit score /100 with evidence coverage and outcome. Fit contributions table (criterion, points / weight, Met / Partly / Not met / Unknown, reason, evidence links). Facts (Verified / Inferred / Not verified) and gaps ("No source in this campaign supplied it"). "Text as retrieved" (collapsed). Activity list. Evidence panel (source, link, excerpt, retrieval date, extraction method).
- **Actions:** Shortlist (New/Dismissed), Dismiss (New/Shortlisted), Mark applied (Job, not Applied; confirm dialog), Set status + Update → `PATCH /api/v1/opportunities/:id/status`; the response replaces the page data and the change is announced. Evidence links jump to `#evidence-<id>`. Back → `/campaigns/:campaignId/opportunities`.
- **State (reads):** `GET /api/v1/opportunities/:id` (`OpportunityDetail`); local `chosen` status, `busy`, `error`.
- **State (writes):** `PATCH /api/v1/opportunities/:id/status` `{ status }` (adds an Activity row server-side).
- **Navigation out:** `/campaigns/:campaignId/opportunities`; external posting/application URLs.
- **Validation:** All status buttons disabled while a change runs. Update disabled when the selected status equals the current one. Mark applied requires `window.confirm`.
- **Status:** built
- **TODOs:** No AI "Explain this match" (OQ-FE-007). No cover-note draft (OQ-FE-008). Activity is read-only — logging notes/replies and next actions are M5 (OQ-FE-006). Agent command text hard-coded (OQ-FE-022).

---

### Applications — Agent activity, keys and setup

- **Route:** `/applications`
- **Component:** `src/features/applications/ApplicationsPage.tsx`, `AgentSetup.tsx`, `HowItWorks.tsx`; logic in `applicationStatus.ts` (tested)
- **What it shows:** Stats: Applied (+ last 7 days), Needs you, Dry runs, Last activity. Activity filters (Status: All, Applied, Needs you, Dry run, Skipped, Failed; Platform: All, LinkedIn, Naukri) and a table (role link, company · location, platform, status badge, detail, when) with Load more. Empty state explaining the agent is not connected. "How the apply agent works": five-node diagram (Campaign → Agent collects → Research → You shortlist → Agent applies) with legend, and the per-job outcome path (Skipped, Needs you, Dry run, Applied, Failed). "Apply agent" section: unofficial-automation warning, agent keys (name, prefix, created, last used, Revoke), create-key form, one-time key reveal, seven setup steps with copyable commands, demo-mode note about `npm run agent -- sync`.
- **Actions:** Refresh → reloads summary and restarts the table. Filter change → page 1. Load more → next page. Role link → job URL in a new tab. "Set up the agent" (empty state) → scrolls to and focuses `#apply-agent`. Create agent key → `POST /api/v1/agent-keys` → key shown once. "I have copied it" → hides it. Revoke → `window.confirm` → `DELETE /api/v1/agent-keys/:id`. Copy → clipboard (failure message when blocked).
- **State (reads):** `GET /api/v1/applications/summary` (`ApplicationSummary`); `GET /api/v1/applications?status&platform&take=50&skip` (`ApplicationPage`); `GET /api/v1/agent-keys` (`AgentKey[]`); `useShell().capabilities.temporaryStorage`.
- **State (writes):** `POST /api/v1/agent-keys` `{ name }` → `CreatedAgentKey` (full key returned once, kept only in component state); `DELETE /api/v1/agent-keys/:id`; clipboard.
- **Navigation out:** external job URLs; in-page anchor `#apply-agent`.
- **Validation:** Create disabled while creating or when the name is blank; name `required`, `maxLength` 100, server `fieldErrors.name` shown. Revoke disabled for the key being revoked. Load more shown only while fewer than `total`; disabled while loading.
- **Status:** built
- **TODOs:** `jobUrl` not passed through `safeHref` (OQ-FE-012). Setup commands hard-coded (OQ-FE-022). Instahyre is in the API enum but not offered as a filter (agent does not support it).

---

### Approval queue — Approve suggested jobs in one batch

- **Route:** none yet (proposed `/approvals`)
- **Component:** none yet (proposed `src/features/approvals/ApprovalQueuePage.tsx` + `approvalModel.ts`)
- **What it shows:** (planned, `../HANDOFF.md` 2026-10-05) Jobs that research auto-suggested above a score threshold, each with fit score, outcome, key reasons and evidence link; the threshold in use; a count of what "Approve all" will shortlist.
- **Actions:** (planned) Approve all → selected jobs become Shortlisted (the agent then applies on its next `apply` run); remove a job from the batch; open a job's detail.
- **State (reads):** (planned) no endpoint exists. Today the nearest is `GET /api/v1/campaigns/:id/opportunities?outcome=Qualified&sort=score`.
- **State (writes):** (planned) no batch endpoint exists; today only per-item `PATCH /api/v1/opportunities/:id/status`.
- **Navigation out:** (planned) `/opportunities/:id`, `/applications`.
- **Validation:** (planned) Approve all disabled when the batch is empty or a request is running; must state what will happen (Shortlisted, not applied).
- **Status:** not built
- **TODOs:** Needs a contract: threshold setting, suggestion source, batch endpoint (OQ-FE-004, OQ-FE-001). Needs a route and nav entry.

---

### Cover notes — Draft a cover note for a job

- **Route:** none yet (planned as a section of `/opportunities/:id`)
- **Component:** none yet (planned in `src/features/opportunities/` or a new `src/features/drafts/`)
- **What it shows:** (planned, `M4_M5_CONTRACT.md` channel `CoverNote`) A generated cover note for the job: greeting, role, matched required skills, the profile's own offer sentence, availability, with `[placeholders]` for unknowns; the basis of each claim (Profile / Evidence); version, approval state, source (Template or Gemini + fallback reason). AI text on the AI surface.
- **Actions:** (planned) Generate → `POST /api/v1/opportunities/:id/drafts { channel: 'CoverNote' }`; edit → `PUT /api/v1/drafts/:id` (clears approval); approve → `POST /api/v1/drafts/:id/approve { version }`; the agent fills the approved note into cover-letter fields (agent side not specified).
- **State (reads):** (planned) `GET /api/v1/opportunities/:id/drafts`, `GET /api/v1/drafts/:id`.
- **State (writes):** (planned) the POST/PUT calls above, `POST /api/v1/drafts/:id/revoke-approval`, `DELETE /api/v1/drafts/:id`.
- **Navigation out:** (planned) none beyond the detail page.
- **Validation:** (planned) Approve disabled when the body is empty or the version is stale (409); every disabled control states its blocker (`sendBlockers`).
- **Status:** not built
- **TODOs:** API M5 not built (OQ-FE-008). Approval model open (OQ-FE-001). Agent cover-letter filling unspecified.
