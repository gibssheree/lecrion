import { useCallback, useEffect, useState } from "react";
import type { SystemNotification } from "../components/layout/NotificationDropdown";

const STORAGE_KEY = "lecrion_system_notif_read";

/**
 * System notifications feed.
 * Not wired to a backend endpoint yet — intentionally empty rather than
 * showing placeholder/demo content. Once a real feed exists (e.g.
 * GET /api/notifications), fetch and map into SystemNotification[] here.
 *
 * Read state is persisted in localStorage by id.
 */
const SEED: Omit<SystemNotification, "read">[] = [];

function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Storage may be unavailable (private mode, quota) — silently degrade
  }
}

export function useSystemNotifications() {
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadIds());

  // Cross-tab sync via storage event
  useEffect(() => {
    function handler(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setReadIds(loadReadIds());
    }
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const notifications: SystemNotification[] = SEED.map((n) => ({
    ...n,
    read: readIds.has(n.id),
  }));

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = useCallback((id: string) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    const next = new Set(SEED.map((n) => n.id));
    setReadIds(next);
    saveReadIds(next);
  }, []);

  return { notifications, unreadCount, markRead, markAllRead };
}
