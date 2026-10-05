import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import { isWakingError, wakeRetryDelay } from './wakeRetry'

export interface ApiState<T> {
  data: T | undefined
  error: Error | undefined
  loading: boolean
  reload: () => void
}

/**
 * Minimal GET hook. While the free host is waking up it retries on its own (staying in `loading`), so a page
 * fills in once the API answers instead of sticking on an error; only a failure that outlasts the retries is shown.
 */
export function useApi<T>(path: string | null): ApiState<T> {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<Error>()
  const [loading, setLoading] = useState(path !== null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (path === null) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    setLoading(true)

    const attempt = (n: number) => {
      api<T>(path)
        .then((d) => {
          if (cancelled) return
          setData(d)
          setError(undefined)
          setLoading(false)
        })
        .catch((e: Error) => {
          if (cancelled) return
          const delay = isWakingError(e) ? wakeRetryDelay(n) : null
          if (delay !== null) {
            timer = setTimeout(() => attempt(n + 1), delay)
            return
          }
          setError(e)
          setLoading(false)
        })
    }
    attempt(0)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [path, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return { data, error, loading, reload }
}
