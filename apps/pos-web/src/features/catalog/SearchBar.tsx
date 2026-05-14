import { useRef, useEffect } from "react";
import { Search, X } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  autoFocusKey?: string; // re-focus when this key changes
}

export default function SearchBar({ value, onChange, autoFocusKey }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  // F1 shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "F1") {
        e.preventDefault();
        ref.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (autoFocusKey !== undefined) ref.current?.focus();
  }, [autoFocusKey]);

  return (
    <div className="search-bar">
      <Search size={15} className="search-icon" />
      <input
        ref={ref}
        className="search-input"
        placeholder="Cari produk… (F1)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          style={{
            position: "absolute",
            right: 22,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            display: "flex",
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
