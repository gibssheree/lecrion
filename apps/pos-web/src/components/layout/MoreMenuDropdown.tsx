import {
  Activity,
  ChevronRight,
  Command,
  Download,
  FileText,
  Keyboard,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  onClose: () => void;
  onOpenCommand: () => void;
}

const ITEMS = [
  {
    icon: Command,
    label: "Command palette",
    shortcut: "Ctrl K",
    action: "command",
  },
  {
    icon: Activity,
    label: "Status sistem",
    shortcut: null,
    to: "/chatbot/live",
  },
  { icon: FileText, label: "Dokumentasi", shortcut: null, to: "/settings" },
  {
    icon: Keyboard,
    label: "Pintasan keyboard",
    shortcut: null,
    to: "/settings",
  },
  { icon: Download, label: "Unduh aplikasi", shortcut: null, to: "/settings" },
] as const;

export default function MoreMenuDropdown({ onClose, onOpenCommand }: Props) {
  const navigate = useNavigate();

  function handleClick(item: (typeof ITEMS)[number]) {
    onClose();
    if (item.action === "command") {
      onOpenCommand();
      return;
    }
    if ("to" in item && item.to) navigate(item.to);
  }

  return (
    <div className="pos-more-menu">
      <header className="pos-more-header">
        <strong>Aksesibilitas</strong>
      </header>

      <nav className="pos-more-nav">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              className="pos-more-item"
              onClick={() => handleClick(item)}
            >
              <Icon size={15} />
              <span className="pos-more-label">{item.label}</span>
              {item.shortcut ? (
                <span className="pos-more-shortcut">{item.shortcut}</span>
              ) : (
                <ChevronRight size={13} className="pos-more-chev" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
