import { describe, expect, it } from 'vitest'
import { ApiError, ApiUnreachableError } from './api'
import { isWakingError, WAKE_RETRY_DELAYS_MS, wakeRetryDelay } from './wakeRetry'

describe('isWakingError', () => {
  it('retries network failures and the proxy errors Render returns while waking', () => {
    expect(isWakingError(new ApiUnreachableError('down'))).toBe(true)
    for (const status of [502, 503, 504]) expect(isWakingError(new ApiError(status, 'x'))).toBe(true)
  })

  it('treats real answers as final', () => {
    for (const status of [400, 401, 403, 404, 409, 500]) expect(isWakingError(new ApiError(status, 'x'))).toBe(false)
    expect(isWakingError(new Error('other'))).toBe(false)
  })
})

describe('wakeRetryDelay', () => {
  it('backs off and stops after about two minutes', () => {
    expect(wakeRetryDelay(0)).toBe(2000)
    expect(wakeRetryDelay(WAKE_RETRY_DELAYS_MS.length - 1)).toBe(30000)
    expect(wakeRetryDelay(WAKE_RETRY_DELAYS_MS.length)).toBeNull()
    expect(wakeRetryDelay(-1)).toBeNull()
    const total = WAKE_RETRY_DELAYS_MS.reduce((a, b) => a + b, 0)
    expect(total).toBeGreaterThanOrEqual(90_000)
    expect(total).toBeLessThanOrEqual(150_000)
  })
})
