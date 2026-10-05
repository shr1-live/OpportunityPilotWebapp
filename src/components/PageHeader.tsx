import type { ReactNode } from 'react'

interface PageHeaderProps {
  /** The page heading (`<h2>`; the top bar holds the `<h1>`). */
  title: ReactNode
  /** Badges or chips shown on the same line as the title. */
  badges?: ReactNode
  /** One explanatory sentence or two under the title. */
  subtitle?: ReactNode
  /** Small muted facts under the title (version, timestamps, IDs). */
  meta?: ReactNode
  /** Buttons or links aligned to the right; they wrap below the title on narrow screens. */
  actions?: ReactNode
}

/** The heading block at the top of a page. One component so every page reads and restyles the same way. */
export function PageHeader({ title, badges, subtitle, meta, actions }: PageHeaderProps) {
  const heading = <h2 className="page-title">{title}</h2>
  return (
    <div className="page-head">
      <div className="page-head-text">
        {badges ? (
          <div className="row wrap">
            {heading}
            {badges}
          </div>
        ) : (
          heading
        )}
        {subtitle && <p className="page-sub">{subtitle}</p>}
        {meta && <p className="muted-small">{meta}</p>}
      </div>
      {actions && <div className="page-head-actions">{actions}</div>}
    </div>
  )
}
