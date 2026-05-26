import { useState, useEffect, useCallback, useRef } from "react";

interface UseApiOptions {
  autoRefreshMs?: number;
  initialLoad?: boolean;
}

/**
 * Generic data-fetching hook.
 *
 * Improvements over the original setInterval approach:
 *  - Exponential backoff on failure: base * 2^failures, capped at 5 minutes.
 *    Prevents hammering a down server.
 *  - Next poll only scheduled AFTER previous request completes (was parallel).
 *  - `lastFetchedAt` exposed so callers can show "updated X seconds ago".
 *  - `failCount` reset to 0 on any success, restoring normal cadence.
 */
export function useApi<T>(
  fetchFn: () => Promise<T>,
  deps: unknown[] = [],
  options: UseApiOptions = {},
) {
  const { autoRefreshMs = 0, initialLoad = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(initialLoad);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  /** Consecutive failure count — drives backoff delay. */
  const failCountRef = useRef(0);

  const load = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      if (mountedRef.current) {
        setData(result);
        setLastFetchedAt(Date.now());
        failCountRef.current = 0; // reset backoff on success
      }
    } catch (err: unknown) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : String(err));
        failCountRef.current += 1;
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;

    /**
     * Self-scheduling runner: calls load() then reschedules itself.
     * Delay doubles on each consecutive failure, capped at 5 minutes.
     *
     * Timeline (autoRefreshMs = 30 000):
     *   success → success → …    : 30s  → 30s  → …
     *   success → fail   → fail  : 30s  → 60s  → 120s → … → 300s
     *   fail resolves            : next interval resets to 30s
     */
    async function run() {
      await load();
      if (!mountedRef.current || autoRefreshMs <= 0) return;
      const delay = Math.min(
        autoRefreshMs * Math.pow(2, failCountRef.current),
        300_000,
      );
      timerRef.current = setTimeout(run, delay);
    }

    if (initialLoad) {
      void run();
    } else if (autoRefreshMs > 0) {
      // No immediate load — start polling after the first interval.
      timerRef.current = setTimeout(run, autoRefreshMs);
    }

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  return { data, loading, error, reload: load, lastFetchedAt };
}
