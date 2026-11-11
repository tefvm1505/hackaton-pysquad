import { useCallback, useEffect, useState } from 'react'

/**
 * Carga datos asíncronos con estados de carga/error.
 * Es deliberadamente simple. Si la app crece (caché, reintentos, invalidación
 * tras aprobar/rechazar), reemplazar por TanStack Query.
 *
 * @template T
 * @param {() => Promise<T>} loader
 * @param {unknown[]} deps Cuando cambian, se vuelve a cargar.
 */
export function useAsync(loader, deps) {
  const [state, setState] = useState({
    data: undefined,
    error: undefined,
    isLoading: true,
  })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState((prev) => ({ ...prev, isLoading: true, error: undefined }))

    loader()
      .then((data) => {
        if (!cancelled) setState({ data, error: undefined, isLoading: false })
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            data: undefined,
            error: error instanceof Error ? error : new Error(String(error)),
            isLoading: false,
          })
        }
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  return { ...state, reload }
}
