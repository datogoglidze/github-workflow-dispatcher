import { useEffect, useState } from "react"

export function useFetch<T>(fn: () => Promise<T>, deps: readonly unknown[]) {
  const depKey = JSON.stringify(deps)
  const [state, setState] = useState<{
    depKey: string
    data: T | null
    error: Error | null
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    fn()
      .then((data) => {
        if (!cancelled) setState({ depKey, data, error: null })
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          const error = caught instanceof Error ? caught : new Error("Request failed")
          setState((current) => ({
            depKey,
            data: current?.data ?? null,
            error,
          }))
        }
      })
    return () => {
      cancelled = true
    }
  }, [depKey])

  const current = state?.depKey === depKey ? state : null
  return {
    data: current?.data ?? state?.data ?? null,
    error: current?.error ?? null,
    loading: current == null,
  }
}
