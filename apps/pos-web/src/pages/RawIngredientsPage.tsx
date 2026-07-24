// apps/pos-web/src/pages/RawIngredientsPage.tsx
//
// Phase 12 — Raw Ingredients (Bahan Baku) manager for F&B vertical.
//
// Schema decision: raw materials are stored in the existing `menu` table
// with product_type = "material". This avoids a separate ingredients table
// and lets recipes/BOM reference them directly through the same FK chain.
//
// This page filters menu rows by product_type = "material" and provides:
//   • CRUD via existing /api/products endpoints
//   • Stock summary dengan cost_price * stock = nilai inventori
//   • Quick stock adjustment (set absolute stock)
//   • CSV export

import { FormEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  CircleDollarSign,
  Download,
  Edit3,
  PackagePlus,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import { useApi } from "../hooks/useApi";
import {
  createProduct,
  getProducts,
  updateProduct,
  updateProductStock,
} from "../services/api";
import { useToast } from "../store/toast.store";
import { fmt } from "../utils/fmt";
import { usePagination } from "../hooks/usePagination";
import Pagination from "../components/ui/Pagination";

interface MaterialFormState {
  id: number | null;
  name: string;
  unitCode: string;
  unitName: string;
  costPrice: string;
  stock: string;
  lowStockThreshold: string;
  sku: string;
  notes: string;
}

const emptyForm: MaterialFormState = {
  id: null,
  name: "",
  unitCode: "",
  unitName: "",
  costPrice: "0",
  stock: "0",
  lowStockThreshold: "5",
  sku: "",
  notes: "",
};

const COMMON_UNITS = [
  { code: "pcs", name: "Pieces" },
  { code: "kg", name: "Kilogram" },
  { code: "g", name: "Gram" },
  { code: "l", name: "Liter" },
  { code: "ml", name: "Mililiter" },
  { code: "pack", name: "Pack" },
  { code: "btl", name: "Botol" },
  { code: "bks", name: "Bungkus" },
];

export default function RawIngredientsPage() {
  const toast = useToast();
  const products = useApi(() => getProducts(), [], { autoRefreshMs: 60_000 });

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<MaterialFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Quick stock adjustment row state — id → input value
  const [stockEdit, setStockEdit] = useState<Record<number, string>>({});

  const allProducts = products.data?.products ?? [];

  // Filter only materials
  const materials = useMemo(
    () =>
      allProducts.filter(
        (p: any) =>
          p.product_type === "material" || p.productType === "material",
      ),
    [allProducts],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return materials;
    return materials.filter(
      (m: any) =>
        (m.name ?? "").toLowerCase().includes(q) ||
        (m.sku ?? "").toLowerCase().includes(q),
    );
  }, [materials, search]);

  const pagination = usePagination(filtered, 20);

  const stats = useMemo(() => {
    const total = materials.length;
    let totalValue = 0;
    let low = 0;
    let out = 0;
    for (const m of materials) {
      const stock = Number(m.stock) || 0;
      const cost = Number(m.cost_price ?? m.costPrice) || 0;
      totalValue += stock * cost;
      const threshold =
        Number(m.low_stock_threshold ?? m.lowStockThreshold) || 5;
      if (stock <= 0) out += 1;
      else if (stock <= threshold) low += 1;
    }
    return { total, totalValue, low, out };
  }, [materials]);

  function openForm(material: any | null) {
    if (material) {
      setForm({
        id: material.id,
        name: material.name ?? "",
        unitCode: material.unit_code ?? material.unitCode ?? "",
        unitName: material.unit_name ?? material.unitName ?? "",
        costPrice: String(material.cost_price ?? material.costPrice ?? 0),
        stock: String(material.stock ?? 0),
        lowStockThreshold: String(
          material.low_stock_threshold ?? material.lowStockThreshold ?? 5,
        ),
        sku: material.sku ?? "",
        notes: material.notes ?? "",
      });
    } else {
      setForm(emptyForm);
    }
    setShowForm(true);
  }

  function resetForm() {
    setForm(emptyForm);
    setShowForm(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      toast.warning("Nama bahan baku wajib diisi");
      return;
    }
    const costPrice = Number(form.costPrice) || 0;
    const stock = Number(form.stock) || 0;
    const threshold = Number(form.lowStockThreshold) || 0;

    if (stock < 0 || costPrice < 0) {
      toast.error("Stok dan harga beli tidak boleh negatif");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name,
        productType: "material",
        isStockTracked: true,
        unitCode: form.unitCode.trim() || undefined,
        unitName: form.unitName.trim() || undefined,
        costPrice,
        // Sale price irrelevant — but schema requires price >= 0; mirror cost.
        price: costPrice,
        stock,
        lowStockThreshold: threshold,
        sku: form.sku.trim() || undefined,
      };
      if (form.id) {
        await updateProduct(form.id, payload);
        toast.success(`Bahan "${name}" diperbarui`);
      } else {
        await createProduct(payload);
        toast.success(`Bahan "${name}" dibuat`);
      }
      resetForm();
      products.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function deactivateMaterial(material: any) {
    if (!confirm(`Nonaktifkan bahan "${material.name}"?`)) return;
    setSaving(true);
    try {
      await updateProduct(material.id, { isActive: false });
      toast.success("Bahan dinonaktifkan");
      products.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menonaktifkan");
    } finally {
      setSaving(false);
    }
  }

  async function applyStockEdit(material: any) {
    const draft = stockEdit[material.id];
    if (draft === undefined || draft === "") return;
    const newStock = Number(draft);
    if (!Number.isFinite(newStock) || newStock < 0) {
      toast.warning("Stok harus angka >= 0");
      return;
    }
    setSaving(true);
    try {
      await updateProductStock(material.id, newStock);
      toast.success(`Stok "${material.name}" diperbarui`);
      setStockEdit((prev) => {
        const next = { ...prev };
        delete next[material.id];
        return next;
      });
      products.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah stok");
    } finally {
      setSaving(false);
    }
  }

  function exportCsv() {
    if (!materials.length) return;
    const header = [
      "Nama",
      "SKU",
      "Stok",
      "Satuan",
      "Harga Beli",
      "Nilai Stok",
      "Threshold",
      "Aktif",
    ];
    const rows = materials.map((m: any) => {
      const stock = Number(m.stock) || 0;
      const cost = Number(m.cost_price ?? m.costPrice) || 0;
      return [
        m.name,
        m.sku ?? "",
        stock,
        m.unit_code ?? m.unitCode ?? "",
        cost,
        stock * cost,
        m.low_stock_threshold ?? m.lowStockThreshold ?? "",
        m.is_active === false ? "tidak" : "ya",
      ];
    });
    const csv = [header, ...rows]
      .map((r) =>
        r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bahan-baku.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PosAppShell title="Bahan Baku">
      <div
        className="summary-grid"
        style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}
      >
        <div className="summary-card">
          <div className="summary-card-label">
            <PackagePlus size={13} /> Total Bahan
          </div>
          <div className="summary-card-value">{stats.total}</div>
          <div className="summary-card-sub">tipe material</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <CircleDollarSign size={13} color="var(--stock-ok)" /> Nilai Stok
          </div>
          <div
            className="summary-card-value"
            style={{ color: "var(--stock-ok)" }}
          >
            Rp{fmt(stats.totalValue)}
          </div>
          <div className="summary-card-sub">harga beli × stok saat ini</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <AlertTriangle size={13} color="var(--stock-low)" /> Stok Menipis
          </div>
          <div
            className="summary-card-value"
            style={{ color: "var(--stock-low)" }}
          >
            {stats.low}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <Boxes size={13} color="var(--stock-out)" /> Habis
          </div>
          <div
            className="summary-card-value"
            style={{ color: "var(--stock-out)" }}
          >
            {stats.out}
          </div>
        </div>
      </div>

      <div className="dashboard-card">
        <div
          className="dashboard-card-header"
          style={{ gap: 8, flexWrap: "wrap" }}
        >
          <PackagePlus size={14} color="var(--text-muted)" />
          <strong style={{ fontSize: 13 }}>Daftar Bahan Baku</strong>
          <div
            style={{
              position: "relative",
              marginLeft: 12,
              minWidth: 240,
            }}
          >
            <Search
              size={13}
              color="var(--text-muted)"
              style={{
                position: "absolute",
                left: 8,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            />
            <input
              className="form-input form-input-sm"
              placeholder="Cari nama atau SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 26, width: "100%" }}
            />
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => products.reload()}
              title="Muat ulang"
            >
              <RefreshCw size={13} />
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={exportCsv}
              disabled={!materials.length}
            >
              <Download size={13} /> CSV
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => openForm(null)}
            >
              <Plus size={13} /> Bahan Baru
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={submit} className="management-form">
            <div className="form-group" style={{ gridColumn: "span 2" }}>
              <label className="form-label">Nama Bahan *</label>
              <input
                className="form-input"
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Misal: Beras, Tepung Terigu, Susu UHT 1L"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">SKU</label>
              <input
                className="form-input"
                value={form.sku}
                onChange={(e) =>
                  setForm((p) => ({ ...p, sku: e.target.value }))
                }
                placeholder="opsional"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Satuan (kode)</label>
              <input
                className="form-input"
                list="unit-codes"
                value={form.unitCode}
                onChange={(e) =>
                  setForm((p) => ({ ...p, unitCode: e.target.value }))
                }
                placeholder="kg, l, pcs, …"
              />
              <datalist id="unit-codes">
                {COMMON_UNITS.map((u) => (
                  <option key={u.code} value={u.code}>
                    {u.name}
                  </option>
                ))}
              </datalist>
            </div>
            <div className="form-group">
              <label className="form-label">Satuan (nama)</label>
              <input
                className="form-input"
                value={form.unitName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, unitName: e.target.value }))
                }
                placeholder="Kilogram, Liter, …"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Harga Beli (per satuan)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="100"
                value={form.costPrice}
                onChange={(e) =>
                  setForm((p) => ({ ...p, costPrice: e.target.value }))
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">Stok Awal</label>
              <input
                className="form-input"
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) =>
                  setForm((p) => ({ ...p, stock: e.target.value }))
                }
                disabled={form.id != null}
              />
              {form.id != null && (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginTop: 4,
                  }}
                >
                  Untuk ubah stok, gunakan kolom "Stok" di tabel.
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Threshold Stok Menipis</label>
              <input
                className="form-input"
                type="number"
                min="0"
                value={form.lowStockThreshold}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    lowStockThreshold: e.target.value,
                  }))
                }
              />
            </div>
            <div
              className="form-actions"
              style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}
            >
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={saving}
              >
                <Save size={13} /> {form.id ? "Simpan" : "Buat Bahan"}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={resetForm}
              >
                <X size={13} /> Batal
              </button>
            </div>
          </form>
        )}

        <div className="dashboard-card-body" style={{ padding: 0 }}>
          {products.loading && materials.length === 0 ? (
            <div
              style={{
                padding: 24,
                color: "var(--text-muted)",
                textAlign: "center",
              }}
            >
              Memuat…
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                padding: 28,
                color: "var(--text-muted)",
                textAlign: "center",
              }}
            >
              {search.trim()
                ? "Tidak ada bahan yang cocok"
                : 'Belum ada bahan baku. Klik "Bahan Baru" untuk mulai.'}
            </div>
          ) : (
            <>
              <table className="data-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Nama Bahan</th>
                    <th>SKU</th>
                    <th style={{ textAlign: "right" }}>Harga Beli</th>
                    <th style={{ textAlign: "right", width: 200 }}>
                      Stok Saat Ini
                    </th>
                    <th style={{ textAlign: "right" }}>Nilai</th>
                    <th>Status</th>
                    <th style={{ width: 90, textAlign: "right" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pagination.slice.map((material: any) => {
                    const stock = Number(material.stock) || 0;
                    const cost =
                      Number(material.cost_price ?? material.costPrice) || 0;
                    const threshold =
                      Number(
                        material.low_stock_threshold ??
                          material.lowStockThreshold,
                      ) || 5;
                    const isOut = stock <= 0;
                    const isLow = !isOut && stock <= threshold;
                    const draft = stockEdit[material.id];
                    const inactive = material.is_active === false;
                    return (
                      <tr
                        key={material.id}
                        style={inactive ? { opacity: 0.55 } : undefined}
                      >
                        <td>
                          <div style={{ fontWeight: 600 }}>{material.name}</div>
                          {(material.unit_code || material.unitCode) && (
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--text-muted)",
                              }}
                            >
                              per{" "}
                              {material.unit_name ??
                                material.unitName ??
                                material.unit_code ??
                                material.unitCode}
                            </div>
                          )}
                        </td>
                        <td
                          style={{ fontSize: 12, color: "var(--text-muted)" }}
                        >
                          {material.sku ?? "—"}
                        </td>
                        <td style={{ textAlign: "right" }}>Rp{fmt(cost)}</td>
                        <td style={{ textAlign: "right" }}>
                          <div
                            style={{
                              display: "inline-flex",
                              gap: 4,
                              alignItems: "center",
                            }}
                          >
                            <input
                              className="form-input form-input-sm"
                              type="number"
                              min="0"
                              value={draft ?? stock}
                              onChange={(e) =>
                                setStockEdit((prev) => ({
                                  ...prev,
                                  [material.id]: e.target.value,
                                }))
                              }
                              style={{ width: 90, textAlign: "right" }}
                            />
                            {draft !== undefined &&
                              draft !== "" &&
                              Number(draft) !== stock && (
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => applyStockEdit(material)}
                                  disabled={saving}
                                  title="Simpan stok baru"
                                >
                                  <Save size={11} />
                                </button>
                              )}
                          </div>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          Rp{fmt(stock * cost)}
                        </td>
                        <td>
                          {inactive ? (
                            <span
                              style={{
                                display: "inline-flex",
                                padding: "2px 8px",
                                borderRadius: 10,
                                fontSize: 11,
                                fontWeight: 700,
                                color: "var(--text-muted)",
                                background: "var(--bg-elevated)",
                              }}
                            >
                              Nonaktif
                            </span>
                          ) : isOut ? (
                            <span
                              style={{
                                display: "inline-flex",
                                padding: "2px 8px",
                                borderRadius: 10,
                                fontSize: 11,
                                fontWeight: 700,
                                color: "var(--stock-out)",
                                background: "var(--stock-out-bg)",
                              }}
                            >
                              Habis
                            </span>
                          ) : isLow ? (
                            <span
                              style={{
                                display: "inline-flex",
                                padding: "2px 8px",
                                borderRadius: 10,
                                fontSize: 11,
                                fontWeight: 700,
                                color: "var(--stock-low)",
                                background: "var(--stock-low-bg)",
                              }}
                            >
                              Menipis
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-flex",
                                padding: "2px 8px",
                                borderRadius: 10,
                                fontSize: 11,
                                fontWeight: 700,
                                color: "var(--stock-ok)",
                                background: "var(--stock-ok-bg)",
                              }}
                            >
                              <TrendingUp size={11} /> Aman
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => openForm(material)}
                            title="Edit bahan"
                          >
                            <Edit3 size={12} />
                          </button>
                          {!inactive && (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => deactivateMaterial(material)}
                              style={{ color: "var(--stock-out)" }}
                              title="Nonaktifkan"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {pagination.totalPages > 1 && (
                <div
                  style={{
                    padding: "10px 18px",
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <Pagination {...pagination} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PosAppShell>
  );
}
