# OpportunityPilot — web app

React 19 + TypeScript + Vite SPA for OpportunityPilot. All data goes through the
API in `OpportunityPilotWebApi`; the browser uses Supabase for sign-in only.

## Run locally

```bash
npm install
cp .env.example .env.local   # VITE_DEV_AUTH=true signs in without Supabase
npm run dev                  # http://localhost:5173
```

Start the API first (`dotnet run --project src/OpportunityPilot.Api` in the API
repo, port 5051). The shell shows "API · starting" while it is unreachable.

## Scripts

| Command | What |
|---|---|
| `npm run dev` | Vite dev server on 5173 (strict port; the API's CORS allows it) |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run typecheck` | `tsc -b` only |
| `npm run lint` | oxlint |
| `npm test` | vitest (`src/**/*.test.ts`) |

## Configuration

See `.env.example`. Only public values go in `VITE_` variables. Dev sign-in is
compiled out of production builds (`import.meta.env.DEV`).

## Structure

```
src/
  App.tsx               data router + auth gate (useBlocker needs a data router)
  lib/                  api client, config, useApi hook, Supabase client, DTO types
  components/           ErrorNotice, StatusBadge
  features/
    auth/               AuthProvider (Supabase or dev), SignInPage
    shell/              AppShell (rail, top bar, API readiness polling), ShellContext
    overview/           counts from /api/v1/overview, setup steps
    profiles/           list + versioned editor with per-claim confirmation
    integrations/       renders /api/v1/capabilities
    settings/           account and deployment facts (read-only)
    placeholder/        NotBuiltPage for screens whose milestone is not built
  styles/               tokens.css (from opportunitypilot-ui) + app.css
```

Designs for every screen are in `../opportunitypilot-ui`.

## Deploying

`render.yaml` is a Render Blueprint for a static site: build `npm ci && npm run build`,
publish `dist/`, SPA rewrite to `/index.html`, Node 22. Render prompts for
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; `VITE_API_BASE_URL` is set
in the file. `VITE_` values are compiled in at build time, so changing one needs a
redeploy. Add the site's origin to the API's `Cors__AllowedOrigins__0`.

Step-by-step for API + web + Supabase: `DEPLOY.md` at the workspace root.
