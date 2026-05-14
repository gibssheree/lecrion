import { useState, useEffect, useCallback, useRef } from "react";

interface UseApiOptions {
  autoRefreshMs?: number;
  initialLoad?: boolean;
}

export function useApi<T>(
  fetchFn: () => Promise<T>,
  deps: unknown[] = [],
  options: UseApiOptions = {},
) {
  const { autoRefreshMs = 0, initialLoad = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(initialLoad);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      if (mountedRef.current) setData(result);
    } catch (err: unknown) {
      if (mountedRef.current)
        setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    if (initialLoad) load();
    if (autoRefreshMs > 0) timerRef.current = setInterval(load, autoRefreshMs);
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  return { data, loading, error, reload: load };
}
