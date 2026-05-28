import {
  ChevronRight,
  HelpCircle,
  KeyRound,
  LogOut,
  Settings,
  Shield,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  displayName: string;
  email?: string;
  roleLabel: string;
  storeName?: string;
  onLogout: () => void;
  onClose: () => void;
}

const ITEMS = [
  { icon: User, label: "Profil saya", to: "/settings", section: "account" },
  {
    icon: KeyRound,
    label: "Ubah password",
    to: "/settings",
    section: "account",
  },
  { icon: Settings, label: "Pengaturan", to: "/settings", section: "account" },
  { icon: Shield, label: "Keamanan akun", to: "/settings", section: "account" },
  { icon: HelpCircle, label: "Bantuan", to: "/settings", section: "support" },
] as const;

export default function ProfileDropdown({
  displayName,
  email,
  roleLabel,
  storeName,
  onLogout,
  onClose,
}: Props) {
  const navigate = useNavigate();
  const initial = displayName[0]?.toUpperCase() ?? "?";

  function go(to: string) {
    onClose();
    navigate(to);
  }

  return (
    <div className="pos-profile-menu">
      {/* Header — identity */}
      <header className="pos-profile-header">
        <div className="pos-profile-avatar">{initial}</div>
        <div className="pos-profile-meta">
          <strong>{displayName}</strong>
          {email && <span>{email}</span>}
          <div className="pos-profile-tags">
            <span className="pos-profile-role">{roleLabel}</span>
            {storeName && (
              <span className="pos-profile-store">{storeName}</span>
            )}
          </div>
        </div>
      </header>

      {/* Menu items */}
      <nav className="pos-profile-nav">
        {ITEMS.filter((i) => i.section === "account").map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              className="pos-profile-item"
              onClick={() => go(item.to)}
            >
              <Icon size={15} />
              <span>{item.label}</span>
              <ChevronRight size={13} className="pos-profile-chev" />
            </button>
          );
        })}

        <div className="pos-profile-sep" role="separator" />

        {ITEMS.filter((i) => i.section === "support").map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              className="pos-profile-item"
              onClick={() => go(item.to)}
            >
              <Icon size={15} />
              <span>{item.label}</span>
              <ChevronRight size={13} className="pos-profile-chev" />
            </button>
          );
        })}

        <div className="pos-profile-sep" role="separator" />

        <button
          type="button"
          className="pos-profile-item pos-profile-item--danger"
          onClick={onLogout}
        >
          <LogOut size={15} />
          <span>Keluar</span>
        </button>
      </nav>
    </div>
  );
}
