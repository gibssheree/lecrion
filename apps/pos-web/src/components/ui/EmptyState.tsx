// apps/pos-web/src/components/ui/EmptyState.tsx
//
// Reusable empty-state block: icon + title + optional description + optional CTA.
// Use `compact` for inline table/card empties, default for full-section empties.

import { ReactNode } from "react";

interface Props {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; icon?: ReactNode };
  compact?: boolean;
}

export default function EmptyState({ icon, title, description, action, compact }: Props) {
  return (
    <div className={`empty-state${compact ? " empty-state--compact" : ""}`}>
      <div className="empty-state-icon">{icon}</div>
      <div className="empty-state-title">{title}</div>
      {description && <p className="empty-state-desc">{description}</p>}
      {action && (
        <button
          className="btn btn-primary btn-sm"
          onClick={action.onClick}
          style={{ marginTop: 6, gap: 6 }}
        >
          {action.icon}
          {action.label}
        </button>
      )}
    </div>
  );
}
