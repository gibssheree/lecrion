// apps/pos-web/src/hooks/useOnlineStatus.ts
//
// Phase 8 — Offline Mode: tracks browser online/offline status.
//
// Uses navigator.onLine + window events for real-time detection.
// Also does a lightweight API ping to confirm actual connectivity
// (navigator.onLine can be true even when the API is unreachable).

import { useState, useEffect, useCallback } from "react";

const PING_URL = "/api/health";
const PING_INTERVAL_MS = 30_000;
const PING_TIMEOUT_MS = 5_000;

async function pingApi(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    const res = await fetch(PING_URL, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

export interface OnlineStatus {
  /** true when browser reports online AND API ping succeeds */
  isOnline: boolean;
  /** true when browser reports offline (fast, no ping needed) */
  isBrowserOffline: boolean;
  /** Last time online status was confirmed */
  lastCheckedAt: number;
  /** Manually trigger a connectivity check */
  check: () => Promise<void>;
}

export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isBrowserOffline, setIsBrowserOffline] = useState(!navigator.onLine);
  const [lastCheckedAt, setLastCheckedAt] = useState(Date.now());

  const check = useCallback(async () => {
    if (!navigator.onLine) {
      setIsOnline(false);
      setIsBrowserOffline(true);
      setLastCheckedAt(Date.now());
      return;
    }
    setIsBrowserOffline(false);
    const apiReachable = await pingApi();
    setIsOnline(apiReachable);
    setLastCheckedAt(Date.now());
  }, []);

  useEffect(() => {
    // Browser online/offline events
    function handleOnline() {
      setIsBrowserOffline(false);
      check();
    }
    function handleOffline() {
      setIsOnline(false);
      setIsBrowserOffline(true);
      setLastCheckedAt(Date.now());
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodic ping
    const interval = setInterval(check, PING_INTERVAL_MS);

    // Initial check
    check();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [check]);

  return { isOnline, isBrowserOffline, lastCheckedAt, check };
}
