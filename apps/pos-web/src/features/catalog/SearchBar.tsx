// apps/pos-web/src/features/catalog/SearchBar.tsx
//
// Phase 6A: Barcode scanner support.
//
// Barcode scanners work as keyboard input — they type the barcode string
// very quickly and press Enter. This component:
//   • Detects when the value looks like a barcode (8-14 digits).
//   • Shows a barcode icon indicator when in barcode mode.
//   • Accepts an onBarcodeSubmit callback for when Enter is pressed in barcode mode.
//   • F1 shortcut still focuses the input.

import { useRef, useEffect } from "react";
import { Search, X, Barcode } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  autoFocusKey?: string; // re-focus when this key changes
  /** Called when Enter is pressed and value looks like a barcode */
  onBarcodeSubmit?: (barcode: string) => void;
}

function looksLikeBarcode(s: string): boolean {
  return /^\d{8,14}$/.test(s.trim());
}

export default function SearchBar({
  value,
  onChange,
  autoFocusKey,
  onBarcodeSubmit,
}: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const isBarcodeMode = looksLikeBarcode(value);

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

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && isBarcodeMode && onBarcodeSubmit) {
      e.preventDefault();
      onBarcodeSubmit(value.trim());
    }
  }

  return (
    <div className="search-bar">
      {isBarcodeMode ? (
        <Barcode
          size={15}
          className="search-icon"
          style={{ color: "var(--color-primary, #2563eb)" }}
        />
      ) : (
        <Search size={15} className="search-icon" />
      )}
      <input
        ref={ref}
        className="search-input"
        placeholder="Cari produk, SKU, barcode… (F1)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        inputMode="search"
        style={
          isBarcodeMode
            ? {
                color: "var(--color-primary, #2563eb)",
                fontFamily: "monospace",
                letterSpacing: "0.05em",
              }
            : undefined
        }
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
          aria-label="Hapus pencarian"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
