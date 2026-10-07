import { useCallback, useEffect, useState } from 'react'
import { api, ApiStillUnreachableError, ApiUnreachableError } from './api'
import { isWakingError, wakeRetryDelay } from './wakeRetry'

export interface ApiState<T> {
  data: T | undefined
  error: Error | undefined
  loading: boolean
  /** True while retrying because the free host is waking up. */
  waking: boolean
  reload: () => void
}

/**
 * Minimal GET hook. While the free host is waking up it retries on its own (staying in `loading`), so a page
 * fills in once the API answers instead of sticking on an error; only a failure that outlasts the retries is shown.
 */
export function useApi<T>(path: string | null): ApiState<T> {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<Error>()
  const [settledKey, setSettledKey] = useState<string | null>(null)
  const [waking, setWaking] = useState(false)
  const [nonce, setNonce] = useState(0)
  const requestKey = path === null ? null : `${path}\u0000${nonce}`

  useEffect(() => {
    if (path === null) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const attempt = (n: number) => {
      api<T>(path)
        .then((d) => {
          if (cancelled) return
          setData(d)
          setError(undefined)
          setSettledKey(requestKey)
          setWaking(false)
        })
        .catch((e: Error) => {
          if (cancelled) return
          const delay = isWakingError(e) ? wakeRetryDelay(n) : null
          if (delay !== null) {
            setWaking(true)
            timer = setTimeout(() => attempt(n + 1), delay)
            return
          }
          // Say that retries happened only when they did.
          setError(e instanceof ApiUnreachableError && n > 0 ? new ApiStillUnreachableError(e.message) : e)
          setSettledKey(requestKey)
          setWaking(false)
        })
    }
    attempt(0)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [path, nonce, requestKey])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  const loading = requestKey !== null && settledKey !== requestKey
  return { data, error: loading ? undefined : error, loading, waking, reload }
}
