import type { ReactNode } from 'react'

/**
 * One closed line that opens to the longer explanation (provider boundaries, what is stored, what is manual).
 * Keeps screens short without hiding the honesty copy: the summary always states the boundary in a few words.
 */
export function HowItWorks({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  return (
    <details className="how-it-works">
      <summary>{summary}</summary>
      <div className="how-it-works-body">{children}</div>
    </details>
  )
}
