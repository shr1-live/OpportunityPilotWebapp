import { useCallback, useEffect, useState } from 'react'
import { api } from './api'

export interface ApiState<T> {
  data: T | undefined
  error: Error | undefined
  loading: boolean
  reload: () => void
}

/** Minimal GET hook. Enough for M0–M1; revisit if caching needs grow. */
export function useApi<T>(path: string | null): ApiState<T> {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<Error>()
  const [loading, setLoading] = useState(path !== null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (path === null) return
    let cancelled = false
    setLoading(true)
    api<T>(path)
      .then((d) => {
        if (!cancelled) {
          setData(d)
          setError(undefined)
        }
      })
      .catch((e: Error) => !cancelled && setError(e))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [path, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return { data, error, loading, reload }
}
