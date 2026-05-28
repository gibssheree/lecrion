import { useCallback, useEffect, useState } from "react";
import type { SystemNotification } from "../components/layout/NotificationDropdown";

const STORAGE_KEY = "lecrion_system_notif_read";

/**
 * Mock system notifications — promo, fitur baru, maintenance, info.
 * In production, these come from a backend feed (e.g. /api/notifications).
 *
 * Read state is persisted in localStorage by id.
 */
const SEED: Omit<SystemNotification, "read">[] = [
  {
    id: "promo-bundling-2026-q2",
    type: "promo",
    title: "Promo bundling — gratis 1 outlet",
    body: "Upgrade ke paket Growth tahunan, dapat 1 outlet tambahan gratis selama 6 bulan.",
    createdAt: new Date(Date.now() - 30 * 60_000).toISOString(),
    cta: "Lihat promo",
    href: "/settings",
  },
  {
    id: "feature-loyalty-2026-05",
    type: "feature",
    title: "Loyalty program kini live",
    body: "Atur earn rate, redeem rate, dan tier pelanggan langsung dari dashboard. Aktifkan via Pengaturan.",
    createdAt: new Date(Date.now() - 4 * 60 * 60_000).toISOString(),
    cta: "Coba sekarang",
    href: "/settings",
  },
  {
    id: "maintenance-2026-05-30",
    type: "maintenance",
    title: "Maintenance terjadwal Jumat 30 Mei",
    body: "Sistem akan offline 02:00–02:30 WIB untuk update database. Transaksi tetap aman dengan offline mode.",
    createdAt: new Date(Date.now() - 22 * 60 * 60_000).toISOString(),
  },
  {
    id: "info-pajak-2026",
    type: "info",
    title: "Tarif pajak otomatis diperbarui",
    body: "Pengaturan PPN 11% sudah diterapkan untuk semua transaksi baru sesuai regulasi terbaru.",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60_000).toISOString(),
  },
];

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
