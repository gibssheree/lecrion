import { useState } from "react";
import { useApi } from "../hooks/useApi";
import { getProducts, updateProductStock } from "../services/api";
import { Warehouse, AlertTriangle } from "lucide-react";
import {
  StatCard,
  StatGrid,
  StockBadge,
  PageHeader,
  DataTable,
} from "../components/ui";

function fmt(n: number | null | undefined): string {
  return new Intl.NumberFormat("id-ID").format(Math.round(Number(n ?? 0)));
}

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");
  const [saving, setSaving] = useState(false);
  const products = useApi(getProducts, [], { autoRefreshMs: 30_000 });

  const rows = ((products.data?.products ?? []) as any[]).filter(
    (p) =>
      !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase()),
  );
  const lowStock = rows.filter((p: any) => p.stock <= 5 && p.stock > 0);
  const outOfStock = rows.filter((p: any) => p.stock <= 0);

  async function handleSaveStock(id: number) {
    const newStock = Number(editVal);
    if (isNaN(newStock) || newStock < 0) {
      alert("Stok harus >= 0");
      return;
    }
    setSaving(true);
    try {
      await updateProductStock(id, newStock);
      products.reload();
      setEditId(null);
    } catch (err: unknown) {
      alert(
        "Gagal update stok: " +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <StatGrid columns={3}>
        <StatCard color="blue" label="Total Produk" value={rows.length} />
        <StatCard
          color="yellow"
          label="Stok Menipis (≤5)"
          value={lowStock.length}
        />
        <StatCard color="red" label="Habis" value={outOfStock.length} />
      </StatGrid>

      {lowStock.length > 0 && (
        <div
          className="alert warning"
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <AlertTriangle size={14} />
          {lowStock.length} produk memiliki stok ≤ 5:{" "}
          {lowStock.map((p: any) => p.name).join(", ")}
        </div>
      )}

      <div className="card">
        <div className="card-title" style={{ justifyContent: "space-between" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Warehouse size={14} /> Katalog Produk
          </span>
          <PageHeader onRefresh={products.reload}>
            <input
              className="form-input"
              placeholder="Cari produk…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 200 }}
            />
          </PageHeader>
        </div>

        <DataTable
          loading={products.loading}
          rows={rows}
          rowKey={(p) => p.id}
          emptyMessage="Tidak ada produk"
          columns={[
            {
              key: "name",
              header: "Produk",
              render: (p) => <span style={{ fontWeight: 500 }}>{p.name}</span>,
            },
            { key: "category", header: "Kategori", render: (p) => p.category },
            {
              key: "price",
              header: "Harga",
              render: (p) => `Rp${fmt(p.price)}`,
            },
            {
              key: "stock",
              header: "Stok",
              render: (p) =>
                editId === p.id ? (
                  <input
                    className="form-input"
                    style={{ width: 80, padding: "4px 8px" }}
                    type="number"
                    min="0"
                    value={editVal}
                    onChange={(e) => setEditVal(e.target.value)}
                    autoFocus
                  />
                ) : (
                  <span
                    style={{
                      fontWeight: 600,
                      color:
                        p.stock <= 0
                          ? "var(--accent-red)"
                          : p.stock <= 5
                            ? "var(--accent-yellow)"
                            : "var(--accent-green)",
                    }}
                  >
                    {p.stock}
                  </span>
                ),
            },
            {
              key: "status",
              header: "Status",
              render: (p) => <StockBadge stock={p.stock} />,
            },
            {
              key: "action",
              header: "Aksi",
              render: (p) =>
                editId === p.id ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={saving}
                      onClick={() => handleSaveStock(p.id)}
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
                    Edit Stok
                  </button>
                ),
            },
          ]}
        />
      </div>
    </>
  );
}
