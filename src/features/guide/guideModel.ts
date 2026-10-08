/** Text for /how-it-works. It describes what this build does; keep it in step with the API and agent. */

export interface GuideStep {
  title: string
  what: string
  where: string
  link?: { to: string; label: string }
}

export const PIPELINE_STEPS: GuideStep[] = [
  {
    title: 'Profile',
    what: 'You describe what you offer in your own words and confirm each claim. Fit is judged against it; nothing is invented for you.',
    where: 'Profiles',
    link: { to: '/profiles', label: 'Profiles' },
  },
  {
    title: 'Campaign',
    what: 'One search: a mode (Jobs or Customers), your criteria — keywords, skills, places, years, exclusions — and the sources to read.',
    where: 'Campaigns → builder',
    link: { to: '/campaigns', label: 'Campaigns' },
  },
  {
    title: 'Gather',
    what: 'The server reads each source. Greenhouse lists the whole board and keeps titles that match your keywords; Lever reads postings. A per-run budget is shared fairly across sources.',
    where: 'Research run → event log',
  },
  {
    title: 'Dedupe and extract',
    what: 'The same posting seen twice becomes one opportunity. Rules (no AI) pull out skills, years asked, location and work mode. Missing facts stay Unknown.',
    where: 'Opportunity → Facts',
  },
  {
    title: 'Filter',
    what: 'Hard rules run first: a clear miss is Excluded with its reason; unknown on a hard rule is Needs verification, never a pass.',
    where: 'Opportunities → Outcome',
    link: { to: '/opportunities', label: 'Opportunities' },
  },
  {
    title: 'Score',
    what: 'Each criterion is Met, Partly, Not met or Unknown (zero). Fit is out of 100 — a ranking, not a chance. Coverage says how much rests on evidence.',
    where: 'Opportunity → How the score was built',
  },
  {
    title: 'Suggest and approve',
    what: 'Jobs at or above your threshold wait in Approvals. You approve a batch in one pass; approved jobs become Shortlisted. Nothing is applied yet.',
    where: 'Approvals',
    link: { to: '/approvals', label: 'Approvals' },
  },
  {
    title: 'Apply',
    what: 'LinkedIn and Naukri: your local agent applies to shortlisted jobs from your own browser, dry run first. Greenhouse, Lever, Adzuna: open the application page and submit yourself.',
    where: 'Applications',
    link: { to: '/applications', label: 'Applications' },
  },
  {
    title: 'Track',
    what: 'Applied status, agent results and the funnel from read to responded — every number from stored data.',
    where: 'Overview',
    link: { to: '/', label: 'Overview' },
  },
]

export const SOURCE_CHECKS: { source: string; add: string; log: string; needs: string }[] = [
  {
    source: 'Greenhouse board',
    add: 'The company board slug, e.g. stripe (from boards.greenhouse.io/stripe)',
    log: 'Greenhouse board stripe: 718 jobs listed, 145 matched your keywords, 24 read.',
    needs: 'Nothing',
  },
  {
    source: 'Lever board',
    add: 'The company slug, e.g. leverdemo (from jobs.lever.co/leverdemo)',
    log: 'Lever company leverdemo: 11 postings listed, 11 read.',
    needs: 'Nothing',
  },
  {
    source: 'Adzuna (India)',
    add: 'Keywords and location come from the campaign',
    log: 'Adzuna job search: searched 2 keywords in India, 40 jobs found, 20 read.',
    needs: 'Server keys',
  },
  {
    source: 'Pasted text / CSV',
    add: 'Postings or company notes you copied; CSV is previewed before it commits',
    log: 'Pasted text: read 3 pasted items. · CSV upload: read 40 of 42 rows.',
    needs: 'Nothing',
  },
  {
    source: 'Public URL / RSS feed',
    add: 'A careers page or a feed you are allowed to read',
    log: 'Public URL: fetched 1 page (12,480 characters of text). · Feed: read 12 feed entries.',
    needs: 'Nothing',
  },
  {
    source: 'Local agent — LinkedIn / Naukri',
    add: 'Run npm run agent -- collect linkedin --campaign <id> on your computer',
    log: 'Local agent · LinkedIn: read 30 of 30 rows.',
    needs: 'Agent key',
  },
]

export const GUIDE_LIMITS = [
  'It never applies, sends or bids without your approval, and never in bulk.',
  'It does not guess: a fact no source supplies stays Unknown and scores zero.',
  'Greenhouse, Lever and Adzuna applications are submitted by you — their apply APIs need the employer’s key.',
  'Emails, LinkedIn messages, contact forms, proposals and bids are drafted and approved here, then sent by you; you record the receipt. Gmail, Freelancer.com and Upwork connections need their keys first.',
  'On free hosting the API sleeps when idle; the first request can take up to a minute.',
]
