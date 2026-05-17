// apps/pos-web/src/features/customers/CustomerDrawer.tsx
//
// CustomerDrawer — search, select, or create a customer for the current sale.
//
// Used from PaymentDrawer. When a customer is selected:
//   • customerName is pre-filled
//   • loyalty point balance is shown
//   • promo/voucher can be applied

import { useState, useEffect, useRef } from "react";
import { Search, X, User, Plus, Star, Tag } from "lucide-react";
import {
  getCategories,
  getProductByBarcode,
  ProductCategory,
} from "../../services/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CustomerSummary {
  id: number;
  name: string;
  phone: string | null;
  tier: string;
  pointBalance?: number;
}

interface Props {
  onSelect: (customer: CustomerSummary | null) => void;
  onClose: () => void;
  selectedCustomer: CustomerSummary | null;
}

// ── Tier badge ────────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  regular: "#6b7280",
  silver: "#9ca3af",
  gold: "#d97706",
  platinum: "#7c3aed",
};

function TierBadge({ tier }: { tier: string }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 6px",
        borderRadius: 4,
        background: TIER_COLORS[tier] ?? "#6b7280",
        color: "#fff",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {tier}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CustomerDrawer({
  onSelect,
  onClose,
  selectedCustomer,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/customers/search?q=${encodeURIComponent(query)}`,
          {
            headers: {
              Authorization: `Bearer ${sessionStorage.getItem("pos_token") ?? ""}`,
            },
          },
        );
        const data = await res.json();
        // Fetch point balances for each customer
        const customers: CustomerSummary[] = await Promise.all(
          (data ?? []).map(async (c: any) => {
            try {
              const pts = await fetch(`/api/customers/${c.id}/points`, {
                headers: {
                  Authorization: `Bearer ${sessionStorage.getItem("pos_token") ?? ""}`,
                },
              });
              const ptsData = await pts.json();
              return { ...c, pointBalance: ptsData.balance ?? 0 };
            } catch {
              return { ...c, pointBalance: 0 };
            }
          }),
        );
        setResults(customers);
      } catch {
        setError("Gagal mencari pelanggan");
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("pos_token") ?? ""}`,
        },
        body: JSON.stringify({
          name: newName.trim(),
          phone: newPhone.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal membuat pelanggan");
      onSelect({
        id: data.customer.id,
        name: data.customer.name,
        phone: data.customer.phone,
        tier: data.customer.tier,
        pointBalance: 0,
      });
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 200,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-surface, #fff)",
          borderRadius: "12px 12px 0 0",
          width: "100%",
          maxWidth: 480,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          padding: 16,
          gap: 12,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 15 }}>Pilih Pelanggan</span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Current selection */}
        {selectedCustomer && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              background: "var(--color-primary-light, #eff6ff)",
              borderRadius: 8,
              border: "1px solid var(--color-primary, #2563eb)",
            }}
          >
            <User size={14} color="var(--color-primary, #2563eb)" />
            <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>
              {selectedCustomer.name}
            </span>
            {selectedCustomer.pointBalance != null && (
              <span
                style={{
                  fontSize: 11,
                  color: "#d97706",
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <Star size={11} /> {selectedCustomer.pointBalance} pts
              </span>
            )}
            <TierBadge tier={selectedCustomer.tier} />
            <button
              onClick={() => onSelect(null)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#6b7280",
              }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Search */}
        <div style={{ position: "relative" }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#9ca3af",
            }}
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama atau nomor HP…"
            style={{
              width: "100%",
              padding: "8px 8px 8px 32px",
              border: "1px solid var(--border-color, #e5e7eb)",
              borderRadius: 8,
              fontSize: 13,
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Results */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {loading && (
            <div
              style={{
                textAlign: "center",
                color: "#9ca3af",
                fontSize: 13,
                padding: 12,
              }}
            >
              Mencari…
            </div>
          )}
          {error && (
            <div style={{ color: "#ef4444", fontSize: 12, padding: "4px 0" }}>
              {error}
            </div>
          )}
          {!loading &&
            results.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  onSelect(c);
                  onClose();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 12px",
                  background:
                    selectedCustomer?.id === c.id
                      ? "var(--color-primary-light, #eff6ff)"
                      : "transparent",
                  border: "1px solid var(--border-color, #e5e7eb)",
                  borderRadius: 8,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <User size={14} color="#6b7280" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                  {c.phone && (
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>
                      {c.phone}
                    </div>
                  )}
                </div>
                {c.pointBalance != null && c.pointBalance > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      color: "#d97706",
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <Star size={11} /> {c.pointBalance}
                  </span>
                )}
                <TierBadge tier={c.tier} />
              </button>
            ))}
          {!loading && query && results.length === 0 && (
            <div
              style={{
                textAlign: "center",
                color: "#9ca3af",
                fontSize: 13,
                padding: 12,
              }}
            >
              Tidak ditemukan
            </div>
          )}
        </div>

        {/* Create new customer */}
        {!creating ? (
          <button
            onClick={() => setCreating(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 12px",
              background: "none",
              border: "1px dashed var(--border-color, #e5e7eb)",
              borderRadius: 8,
              cursor: "pointer",
              color: "var(--color-primary, #2563eb)",
              fontSize: 13,
            }}
          >
            <Plus size={14} /> Buat pelanggan baru
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nama pelanggan *"
              style={{
                padding: "8px 10px",
                border: "1px solid var(--border-color, #e5e7eb)",
                borderRadius: 8,
                fontSize: 13,
              }}
            />
            <input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="Nomor HP (opsional)"
              style={{
                padding: "8px 10px",
                border: "1px solid var(--border-color, #e5e7eb)",
                borderRadius: 8,
                fontSize: 13,
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || loading}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  background: "var(--color-primary, #2563eb)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {loading ? "Menyimpan…" : "Simpan"}
              </button>
              <button
                onClick={() => setCreating(false)}
                style={{
                  padding: "8px 16px",
                  background: "none",
                  border: "1px solid var(--border-color, #e5e7eb)",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Batal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
