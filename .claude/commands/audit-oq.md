---
name: audit-oq
description: Scan src/ (plus env, deploy config and build output) for mocks, hard-codes, stubs, not-built navigation, missing integrations, lint/build warnings and unverified claims; register each NEW gap in docs/open-questions.md, skipping duplicates.
---

# /audit-oq — register gaps in docs/open-questions.md

Audit first, resolve second (`/resolve-oq`). This command changes **only** `docs/open-questions.md` — never source code.

## Steps

1. **Load the tracker.** Read `docs/open-questions.md`. Note the highest `OQ-FE-###` and every `Where` location and title already listed (Open and Resolved).
2. **Run the gates and capture warnings** (from the repo root):
   - `npx tsc -b`
   - `npm run lint` — every oxlint warning/error with `file:line`
   - `npm test`
   - `npm run build` — chunk-size and other warnings, the JS bundle size; delete `dist/` afterwards
3. **Scan `src/`** with Grep (case-insensitive where useful) and read each hit in context:

   | Look for | Pattern / place |
   |---|---|
   | Markers | `TODO`, `FIXME`, `HACK`, `XXX` |
   | Mocks and fake data | `mock`, `dummy`, `sample`, `fake`, `lorem`, `Math.random`, array/object literals of records inside components |
   | Fake async | `setTimeout` that simulates a response (polling/backoff in `AppShell.tsx` and `ResearchProgressPage.tsx` is real) |
   | Not-built screens | `NotBuiltPage` routes in `src/App.tsx`; `Not built yet` badges; disabled options with a milestone (`M[0-9]`) |
   | Milestone copy | `\bM[0-9]\b` in strings — check each still matches `../HANDOFF.md` / the contracts |
   | Hard-coded status/config | Literal URLs (`http`), API hosts, capability states written in JSX instead of read from `/api/v1/capabilities`, CLI commands copied from the agent |
   | Dead navigation | Every `to=`, `navigate(`, `href=` target exists in `src/App.tsx` routes; nav entries in `AppShell.tsx` lead to built screens |
   | Unsafe links | `href={` with data from the API or agent not passed through `safeHref()` |
   | Contract drift | Endpoints called in `src/` vs `../OpportunityPilotWebApi/docs/*_CONTRACT.md`; fields in `src/lib/types.ts` vs the contract DTOs |
   | CSS rules (`CLAUDE.md`) | `#[0-9a-fA-F]{3,8}` / `rgb(` literals in `src/styles/app.css`; `overflow-x` without `position: relative`; mobile `grid-template-columns: 1fr` |
   | Secrets / env | `VITE_` names in `src/lib/config.ts`, `.env.example`, `.env.production`, `render.yaml`, `vercel.json` — public values only |

4. **Compare with the flow docs.** For every entry in `docs/CANDIDATE_FLOW.md`, `docs/SALES_FLOW.md`, `docs/SHARED_FLOW.md`: a TODO that has no OQ gets one; a `not built` entry without an OQ gets one.
5. **De-duplicate.** A finding is a duplicate when an existing entry (Open or Resolved) has the same `Where` file and the same problem. Duplicates are not added; if the line moved, update that entry's `Where` instead.
6. **Register each new gap** as one row in the Open table, next free ID, never reusing a number:
   - **Title** — short, specific.
   - **Priority** — P1 blocks the next planned build or needs a product decision; P2 missing integration or real risk; P3 hygiene, copy, verification.
   - **Owner** — Shivanshu for decisions, credentials and contracts; Claude for code changes.
   - **Status** — `Open`.
   - **Where** — `path:line` (ranges allowed), repo-relative.
   - **What is needed** — the concrete resolution or decision.
7. **Update the header line** "Last audit" with today's date and the new baseline (lint warnings count, tests passed, bundle size).
8. **Report** to the user in three lists: **New** (IDs + titles), **Already tracked** (IDs that still apply), **Intentional** (honest placeholders that need no action, e.g. `NotBuiltPage` copy itself).

## Anti-patterns

- Never fix code during an audit.
- Never renumber or delete entries; resolved ones move to the Resolved table via `/resolve-oq`.
- Never log one gap twice under different titles.
- Never log speculation as fact — say "unverified" in the title when it is.
