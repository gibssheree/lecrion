import { Bell, CheckCheck, Megaphone, Sparkles, Wrench } from "lucide-react";
import { useMemo } from "react";

export interface SystemNotification {
  id: string;
  type: "promo" | "feature" | "maintenance" | "info";
  title: string;
  body: string;
  /** ISO timestamp */
  createdAt: string;
  read: boolean;
  /** Optional href or path to navigate when CTA clicked */
  href?: string;
  cta?: string;
}

interface Props {
  notifications: SystemNotification[];
  onMarkAllRead: () => void;
  onItemClick: (n: SystemNotification) => void;
}

const TYPE_META: Record<
  SystemNotification["type"],
  { icon: typeof Megaphone; color: string; label: string }
> = {
  promo: { icon: Megaphone, color: "#f59e0b", label: "Promo" },
  feature: { icon: Sparkles, color: "#3b82f6", label: "Fitur Baru" },
  maintenance: { icon: Wrench, color: "#ef4444", label: "Maintenance" },
  info: { icon: Bell, color: "#64748b", label: "Info" },
};

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min}m lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}j lalu`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}h lalu`;
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

export default function NotificationDropdown({
  notifications,
  onMarkAllRead,
  onItemClick,
}: Props) {
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  return (
    <div className="pos-notif">
      <header className="pos-notif-header">
        <div>
          <strong>Notifikasi</strong>
          {unreadCount > 0 && (
            <span className="pos-notif-count">{unreadCount} baru</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            className="pos-notif-mark-read"
            onClick={onMarkAllRead}
          >
            <CheckCheck size={13} /> Tandai dibaca
          </button>
        )}
      </header>

      <div className="pos-notif-list">
        {notifications.length === 0 ? (
          <div className="pos-notif-empty">
            <Bell size={20} strokeWidth={1.5} />
            <span>Belum ada notifikasi</span>
          </div>
        ) : (
          notifications.map((n) => {
            const meta = TYPE_META[n.type];
            const Icon = meta.icon;
            return (
              <button
                key={n.id}
                type="button"
                className={`pos-notif-item${n.read ? "" : " is-unread"}`}
                onClick={() => onItemClick(n)}
              >
                <span
                  className="pos-notif-icon"
                  style={{ color: meta.color, background: `${meta.color}1a` }}
                >
                  <Icon size={14} />
                </span>
                <div className="pos-notif-body">
                  <div className="pos-notif-row">
                    <span className="pos-notif-title">{n.title}</span>
                    <span className="pos-notif-time">
                      {relativeTime(n.createdAt)}
                    </span>
                  </div>
                  <p className="pos-notif-text">{n.body}</p>
                  {n.cta && <span className="pos-notif-cta">{n.cta} →</span>}
                </div>
                {!n.read && <span className="pos-notif-dot" aria-hidden />}
              </button>
            );
          })
        )}
      </div>

      {notifications.length > 0 && (
        <footer className="pos-notif-footer">
          <button type="button" className="pos-notif-all">
            Lihat semua notifikasi
          </button>
        </footer>
      )}
    </div>
  );
}
