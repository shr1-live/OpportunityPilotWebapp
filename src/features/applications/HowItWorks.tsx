import type { ReactNode } from 'react'
import { Badge } from '../../components/StatusBadge'

const SUBMIT = <code className="nowrap">--submit</code>

const FLOW: { who: string; where: string; what: ReactNode; tone: 'local' | 'site' | 'cloud' }[] = [
  {
    who: 'Campaign',
    where: 'This app',
    what: 'You set the criteria: keywords, required skills, locations, your experience.',
    tone: 'cloud',
  },
  {
    who: 'Agent collects',
    where: 'Your computer',
    what: 'Searches LinkedIn or Naukri in your own logged-in browser and sends the postings it reads. It applies to nothing.',
    tone: 'local',
  },
  {
    who: 'Research',
    where: 'Server',
    what: 'Scores each posting against your criteria, with the evidence and what is still unknown.',
    tone: 'cloud',
  },
  {
    who: 'You shortlist',
    where: 'This app',
    what: 'Pick the matches worth applying to on the Opportunities page.',
    tone: 'cloud',
  },
  {
    who: 'Agent applies',
    where: 'Your logged-in session',
    what: <>Only shortlisted jobs, filled from your saved answers. A dry run stops before sending; {SUBMIT} sends it.</>,
    tone: 'site',
  },
]

const PATH: { step: string; outcome: string; tone: string; when: ReactNode }[] = [
  { step: 'Job page opened', outcome: 'Skipped', tone: 'neutral', when: 'already applied, or it applies on the company site' },
  { step: 'Form filled step by step', outcome: 'Needs you', tone: 'warning', when: 'a required question your answers do not cover — nothing is sent' },
  { step: 'Last step reached', outcome: 'Dry run · not submitted', tone: 'primary', when: <>running without {SUBMIT}</> },
  { step: 'Submitted', outcome: 'Applied', tone: 'success', when: 'the site confirmed the application' },
  { step: 'Submitted', outcome: 'Failed', tone: 'danger', when: 'no confirmation seen — a screenshot is saved for checking' },
]

/** Diagram of where each part runs and what happens to a single job. */
export function HowItWorks() {
  return (
    <section className="card stack-4" aria-labelledby="how-it-works-heading">
      <h3 id="how-it-works-heading" className="section-heading">
        How the apply agent works
      </h3>

      <ol className="plain-list flow" aria-label="From a campaign to an application">
        {FLOW.map((n, i) => (
          <li key={n.who} className={`flow-node flow-${n.tone}`}>
            <span className="flow-num" aria-hidden="true">
              {i + 1}
            </span>
            <span className="flow-who">{n.who}</span>
            <span className="flow-where">{n.where}</span>
            <span className="flow-what">{n.what}</span>
          </li>
        ))}
      </ol>
      <ul className="plain-list flow-legend small" aria-label="Legend">
        <li>
          <span className="flow-swatch flow-local" aria-hidden="true" /> Runs on your computer
        </li>
        <li>
          <span className="flow-swatch flow-site" aria-hidden="true" /> The job site, in your own session
        </li>
        <li>
          <span className="flow-swatch flow-cloud" aria-hidden="true" /> OpportunityPilot (this app and its server)
        </li>
      </ul>

      <div className="stack-2">
        <h4 className="section-heading">What happens to each shortlisted job</h4>
        <ol className="plain-list decision">
          {PATH.map((p, i) => (
            <li key={`${p.outcome}-${i}`} className="decision-row">
              <span className="decision-step">{p.step}</span>
              <span className="decision-arrow" aria-hidden="true">
                →
              </span>
              <span className="decision-outcome">
                <Badge tone={p.tone}>{p.outcome}</Badge>
                <span className="muted-small"> if {p.when}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="hint">
          The whole run stops — and tells you why — on a security check, a logged-out session, the site’s daily limit,
          your own daily limit, or three failures in a row.
        </p>
      </div>
    </section>
  )
}
