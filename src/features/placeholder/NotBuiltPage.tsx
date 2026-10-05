import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/PageHeader'

interface Props {
  heading: string
  milestone: string
  description: string
}

/** Honest placeholder for a screen whose milestone has not been implemented. No sample data, no dead buttons. */
export function NotBuiltPage({ heading, milestone, description }: Props) {
  return (
    <div className="page">
      <PageHeader title={heading} subtitle={description} />
      <div className="empty">
        <div className="empty-title">Not built yet — milestone {milestone}</div>
        <p className="empty-text">
          This screen is part of the plan but not implemented in this build, so nothing here is simulated. The designs
          are in <code>opportunitypilot-ui</code>. You can set up a profile now; it will be used once this arrives.
        </p>
        <Link className="btn btn-secondary" to="/profiles">
          Go to profiles
        </Link>
      </div>
    </div>
  )
}
