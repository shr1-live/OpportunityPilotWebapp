import { describe, expect, it } from 'vitest'
import type { ResearchJob } from '../../lib/types'
import {
  jobSignature,
  nextPollDelay,
  POLL_LIMIT_MS,
  POLL_MAX_MS,
  POLL_MIN_MS,
  shouldKeepPolling,
  stageDetail,
  stageProgress,
} from './researchModel'

const statuses = (job: Pick<ResearchJob, 'state' | 'stage'>) => stageProgress(job).map((s) => s.status)

describe('stageProgress', () => {
  it('marks earlier stages done and the current one in progress while running', () => {
    expect(statuses({ state: 'Running', stage: 'Extract' })).toEqual(['done', 'done', 'current', 'pending', 'pending', 'pending'])
  })

  it('has not started any stage while queued', () => {
    expect(statuses({ state: 'Queued', stage: 'Prepare' })).toEqual(Array(6).fill('pending'))
  })

  it('marks every stage done once completed, with or without gaps', () => {
    expect(statuses({ state: 'CompletedWithGaps', stage: 'Complete' })).toEqual(Array(6).fill('done'))
  })

  it('shows where a failed or cancelled run stopped and that nothing after it ran', () => {
    expect(statuses({ state: 'Cancelled', stage: 'Gather' })).toEqual(['done', 'stopped', 'pending', 'pending', 'pending', 'pending'])
  })

  it('falls back to the first stage for a stage name it does not know', () => {
    expect(statuses({ state: 'Running', stage: 'Summarize' as never })[0]).toBe('current')
  })
})

describe('stageDetail', () => {
  const counts = { sources: 3, sourcesDone: 2, sourcesFailed: 1, fetched: 40, candidates: 31, qualified: 9, needsVerification: 4, excluded: 18 }
  it('reports real counts and mentions failures only when there are some', () => {
    expect(stageDetail('Gather', counts)).toBe('2 of 3 sources · 40 items fetched · 1 failed')
    expect(stageDetail('Gather', { ...counts, sourcesFailed: 0 })).toBe('2 of 3 sources · 40 items fetched')
    expect(stageDetail('Filter', counts)).toBe('9 qualified · 4 to verify · 18 excluded')
    expect(stageDetail('Score', counts)).toBe('')
  })
})

describe('polling schedule', () => {
  it('checks every 2 s while the job keeps changing', () => {
    expect(nextPollDelay({ unchangedPolls: 0, errors: 0 })).toBe(POLL_MIN_MS)
    expect(nextPollDelay({ unchangedPolls: 2, errors: 0 })).toBe(POLL_MIN_MS)
  })

  it('backs off gradually when nothing changes, capped at 10 s', () => {
    const schedule = [3, 4, 5, 6, 7].map((n) => nextPollDelay({ unchangedPolls: n, errors: 0 }))
    expect(schedule).toEqual([3000, 4500, 6750, POLL_MAX_MS, POLL_MAX_MS])
  })

  it('backs off faster after failed requests', () => {
    expect(nextPollDelay({ unchangedPolls: 0, errors: 1 })).toBe(4500)
    expect(nextPollDelay({ unchangedPolls: 0, errors: 5 })).toBe(POLL_MAX_MS)
  })

  it('stops when the job finishes or after the time limit', () => {
    expect(shouldKeepPolling('Running', 1000)).toBe(true)
    expect(shouldKeepPolling(undefined, 0)).toBe(true)
    expect(shouldKeepPolling('Completed', 1000)).toBe(false)
    expect(shouldKeepPolling('Queued', POLL_LIMIT_MS)).toBe(false)
  })

  it('treats a new event or count as a change', () => {
    const job: ResearchJob = {
      id: 'j', campaignId: 'c', state: 'Running', stage: 'Gather', createdAt: '', startedAt: null, finishedAt: null, safeError: null,
      counts: { sources: 1, sourcesDone: 0, sourcesFailed: 0, fetched: 0, candidates: 0, qualified: 0, needsVerification: 0, excluded: 0 },
      events: [],
    }
    const later = { ...job, counts: { ...job.counts, fetched: 5 } }
    expect(jobSignature(job)).toBe(jobSignature({ ...job }))
    expect(jobSignature(later)).not.toBe(jobSignature(job))
  })
})
