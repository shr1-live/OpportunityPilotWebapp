import { ApiError, ApiUnreachableError } from './api'

/**
 * The free Render host sleeps when idle. While it wakes, requests fail at the network level (or Render's proxy
 * answers 502/503/504). Those are worth retrying; anything else (400, 401, 404, 409…) is a real answer.
 */
export function isWakingError(error: unknown): boolean {
  if (error instanceof ApiUnreachableError) return true
  return error instanceof ApiError && [502, 503, 504].includes(error.status)
}

/** Back-off between automatic retries, about two minutes in total — longer than a cold start normally takes. */
export const WAKE_RETRY_DELAYS_MS = [2000, 4000, 8000, 15000, 20000, 30000, 30000] as const

/** Delay before retry number `attempt` (0-based), or null when retries are exhausted. */
export function wakeRetryDelay(attempt: number): number | null {
  return attempt >= 0 && attempt < WAKE_RETRY_DELAYS_MS.length ? WAKE_RETRY_DELAYS_MS[attempt] : null
}
