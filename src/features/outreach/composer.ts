import type { DraftChannel } from '../../lib/types'

export type ComposerTarget = {
  /** What happens on the one click: open the mail app, or copy the text and open a site. */
  kind: 'mailto' | 'site' | 'copy'
  url: string | null
  /** Short action label, e.g. "Open email app". */
  label: string
  /** Whether the message text must be copied to the clipboard first (sites cannot be pre-filled). */
  copy: boolean
}

const MAILTO_MAX = 1800

/** Where the one-click "Approve & send" takes the user. Nothing is sent by the app: the user sends, then records a receipt. */
export function composerTarget(channel: DraftChannel, d: { recipient: string; subject: string; body: string }): ComposerTarget {
  const to = d.recipient.trim()
  if (channel === 'Email') {
    const q = new URLSearchParams()
    if (d.subject.trim()) q.set('subject', d.subject.trim())
    q.set('body', d.body)
    const url = `mailto:${encodeURIComponent(to)}?${q.toString().replaceAll('+', '%20')}`
    // A very long body cannot travel in a mailto link: fall back to copy + empty composer.
    return url.length > MAILTO_MAX
      ? { kind: 'mailto', url: `mailto:${encodeURIComponent(to)}`, label: 'Open email app (text copied)', copy: true }
      : { kind: 'mailto', url, label: 'Open email app', copy: false }
  }
  if (channel === 'LinkedInMessage') return { kind: 'site', url: /^https:\/\/(www\.)?linkedin\.com\//i.test(to) ? to : 'https://www.linkedin.com/messaging/', label: 'Open LinkedIn Messages (text copied)', copy: true }
  if (channel === 'ContactForm') return { kind: 'site', url: /^https:\/\//i.test(to) ? to : null, label: 'Open the contact form (text copied)', copy: true }
  return { kind: 'copy', url: null, label: 'Copy the text', copy: true }
}

/** The first "[PLACEHOLDER]" left in the text, mirroring the server rule that blocks approval until it is replaced. */
export function unresolvedPlaceholder(...texts: string[]): string | null {
  for (const t of texts) {
    const open = t.indexOf('[')
    const close = open >= 0 ? t.indexOf(']', open + 1) : -1
    if (open >= 0 && close > open + 1) return t.slice(open, close + 1)
  }
  return null
}
