import { useState } from "react";
import { RefreshCw, Warehouse, AlertTriangle } from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import { useApi } from "../hooks/useApi";
import { getProducts, updateProductStock } from "../services/api";

function fmt(n: number): string {
  return new Intl.NumberFormat("id-ID").format(Math.round(Number(n ?? 0)));
}

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");
  const [saving, setSaving] = useState(false);
  const products = useApi(getProducts, [], { autoRefreshMs: 30_000 });

  const rows = ((products.data?.products ?? []) as any[]).filter(
    (p) => !search || p.name?.toLowerCase().includes(search.toLowerCase()),
  );
  const lowStock = rows.filter((p: any) => p.stock > 0 && p.stock <= 5).length;
  const outOfStock = rows.filter((p: any) => p.stock <= 0).length;

  async function handleSave(id: number) {
    const n = Number(editVal);
    if (isNaN(n) || n < 0) {
      alert("Stok harus >= 0");
      return;
    }
    setSaving(true);
    try {
      await updateProductStock(id, n);
      products.reload();
      setEditId(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PosAppShell title="Inventori">
      {/* Stats */}
      <div
        className="summary-grid"
        style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 16 }}
      >
        <div className="summary-card">
          <div className="summary-card-label">
            <Warehouse size={13} /> Total Produk
          </div>
          <div className="summary-card-value">{rows.length}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <AlertTriangle size={13} color="var(--stock-low)" /> Stok Menipis
          </div>
          <div
            className="summary-card-value"
            style={{ color: "var(--stock-low)" }}
          >
            {lowStock}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <AlertTriangle size={13} color="var(--stock-out)" /> Habis
          </div>
          <div
            className="summary-card-value"
            style={{ color: "var(--stock-out)" }}
          >
            {outOfStock}
          </div>
        </div>
      </div>

      {/* Search + table */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            gap: 8,
          }}
        >
          <input
            className="form-input"
            placeholder="Cari produk…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 240 }}
          />
          <button
            className="btn btn-ghost btn-sm"
            onClick={products.reload}
            style={{ display: "flex", alignItems: "center", gap: 5 }}
          >
            <RefreshCw size={13} />
          </button>
        </div>

        {products.loading ? (
          <div className="loading-center">
            <div className="spinner" />
          </div>
        ) : (
          <table className="pos-data-table">
            <thead>
              <tr>
                {["Produk", "Kategori", "Harga", "Stok", "Status", "Aksi"].map(
                  (h) => <th key={h}>{h}</th>,
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((p: any) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{p.name}</td>
                  <td style={{ color: "var(--text-muted)" }}>{p.category}</td>
                  <td>Rp{fmt(p.price)}</td>
                  <td>
                    {editId === p.id ? (
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        value={editVal}
                        onChange={(e) => setEditVal(e.target.value)}
                        style={{ width: 80, padding: "4px 8px" }}
                        autoFocus
                      />
                    ) : (
                      <span
                        style={{
                          fontWeight: 700,
                          color:
                            p.stock <= 0
                              ? "var(--stock-out)"
                              : p.stock <= 5
                                ? "var(--stock-low)"
                                : "var(--stock-ok)",
                        }}
                      >
                        {p.stock}
                      </span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`stock-badge ${
                        p.stock <= 0
                          ? "stock-badge--out"
                          : p.stock <= 5
                            ? "stock-badge--low"
                            : "stock-badge--ok"
                      }`}
                    >
                      {p.stock <= 0 ? "Habis" : p.stock <= 5 ? "Menipis" : "OK"}
                    </span>
                  </td>
                  <td>
                    {editId === p.id ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={saving}
                          onClick={() => handleSave(p.id)}
                        >
                          {saving ? "…" : "Simpan"}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setEditId(null)}
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setEditId(p.id);
                          setEditVal(String(p.stock));
                        }}
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PosAppShell>
  );
}
