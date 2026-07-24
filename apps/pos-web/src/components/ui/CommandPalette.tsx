// apps/pos-web/src/components/ui/CommandPalette.tsx
//
// Command palette — open with Ctrl+K / Cmd+K.
// Shows navigation items + quick actions, filtered by search.
// Arrow keys navigate, Enter confirms, Esc closes.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import {
  BusinessPresetKey,
  flattenNavigation,
  MAIN_NAV,
} from "../../navigation/navigation.registry";
import { usePermissions } from "../../hooks/usePermissions";
import { useStoreCapabilities } from "../../hooks/useStoreCapabilities";

interface CmdItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  to?: string;
  action?: () => void;
  section: string;
  keywords?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: Props) {
  const navigate = useNavigate();
  const permissions = usePermissions();
  const { businessPreset, hasModule } = useStoreCapabilities();
  const [query, setQuery] = useState("");
  const [focusedIdx, setFocusedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build nav items from MAIN_NAV filtered by permissions
  const navItems: CmdItem[] = flattenNavigation(MAIN_NAV).filter((item) => {
    const preset = businessPreset as BusinessPresetKey | null;
    if (item.presets && (!preset || !item.presets.includes(preset))) {
      return false;
    }
    if (item.excludePresets && preset && item.excludePresets.includes(preset)) {
      return false;
    }
    if (!hasModule(item.requiredModule)) return false;
    if (item.requirePermission && !permissions[item.requirePermission]) return false;
    return true;
  }).map((item) => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    to: item.to,
    section: "Navigasi",
  }));

  const allItems: CmdItem[] = [...navItems];

  const filtered = query.trim()
    ? allItems.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.keywords?.toLowerCase().includes(query.toLowerCase()),
      )
    : allItems;

  // Group by section
  const sections = Array.from(new Set(filtered.map((i) => i.section)));

  // Reset focus when query or open changes
  useEffect(() => {
    setFocusedIdx(0);
  }, [query, open]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
      setQuery("");
    }
  }, [open]);

  // Scroll focused item into view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(".cmd-item--focused");
    el?.scrollIntoView({ block: "nearest" });
  }, [focusedIdx]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[focusedIdx];
      if (item) activate(item);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  function activate(item: CmdItem) {
    onClose();
    if (item.to) navigate(item.to);
    else item.action?.();
  }

  let globalIdx = 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="cmd-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className="cmd-palette"
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ duration: 0.14, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Input row */}
            <div className="cmd-input-row">
              <Search size={16} />
              <input
                ref={inputRef}
                className="cmd-input"
                placeholder="Cari menu atau fitur…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                spellCheck={false}
              />
              <span className="cmd-kbd">Esc</span>
            </div>

            {/* Results */}
            <div className="cmd-results" ref={listRef}>
              {filtered.length === 0 ? (
                <div className="cmd-empty">Tidak ada hasil untuk "{query}"</div>
              ) : (
                sections.map((section) => {
                  const sectionItems = filtered.filter(
                    (item) => item.section === section,
                  );
                  return (
                    <div key={section}>
                      <div className="cmd-section-label">{section}</div>
                      {sectionItems.map((item) => {
                        const idx = globalIdx++;
                        const isFocused = idx === focusedIdx;
                        return (
                          <div
                            key={item.id}
                            className={`cmd-item${isFocused ? " cmd-item--focused" : ""}`}
                            onMouseEnter={() => setFocusedIdx(idx)}
                            onClick={() => activate(item)}
                          >
                            <span className="cmd-item-icon">{item.icon}</span>
                            <span className="cmd-item-label">{item.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer hints */}
            <div className="cmd-footer">
              <span>↑↓ navigasi</span>
              <span>↵ buka</span>
              <span>Esc tutup</span>
              <span style={{ marginLeft: "auto", opacity: 0.6 }}>
                {filtered.length} hasil
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
