import { NotBuiltState } from '../../components/States'
import { PageHeader } from '../../components/PageHeader'

interface Props {
  heading: string
  milestone: string
  description: string
  willDo: string[]
  today: { label: string; to: string; primary?: boolean }[]
}

/** Honest placeholder for a screen whose milestone has not been implemented. No sample data, no dead buttons. */
export function NotBuiltPage({ heading, milestone, description, willDo, today }: Props) {
  return (
    <div className="page stack-5">
      <PageHeader title={heading} subtitle={description} />
      <NotBuiltState
        title={`${heading} is not built yet — milestone ${milestone}.`}
        note="Nothing below is simulated."
        willDo={willDo}
        today={today}
      />
    </div>
  )
}
