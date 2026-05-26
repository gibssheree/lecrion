// apps/pos-web/src/pages/ProductDetailPage.tsx
//
// Full detail view for a single product — accessed via /products/:id

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Save, X } from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import { getProductById, updateProductStock, updateProduct } from "../services/api";
import { useToast } from "../store/toast.store";
import { fmt } from "../utils/fmt";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Inline stock edit
  const [editingStock, setEditingStock] = useState(false);
  const [stockVal, setStockVal] = useState("");
  const [savingStock, setSavingStock] = useState(false);

  // Inline active toggle
  const [toggling, setToggling] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await getProductById(Number(id));
      setProduct(res.product ?? res);
    } catch {
      setError("Produk tidak ditemukan");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveStock() {
    const n = Number(stockVal);
    if (isNaN(n) || n < 0) {
      toast.warning("Stok tidak boleh kurang dari 0");
      return;
    }
    setSavingStock(true);
    try {
      await updateProductStock(Number(id), n);
      await load();
      setEditingStock(false);
      toast.success("Stok berhasil diperbarui");
    } catch (e: any) {
      toast.error(e.message ?? "Gagal update stok");
    } finally {
      setSavingStock(false);
    }
  }

  async function handleToggleActive() {
    if (!product) return;
    setToggling(true);
    try {
      await updateProduct(Number(id), { isActive: !product.isActive });
      await load();
      toast.success(product.isActive ? "Produk dinonaktifkan" : "Produk diaktifkan");
    } catch (e: any) {
      toast.error(e.message ?? "Gagal mengubah status produk");
    } finally {
      setToggling(false);
    }
  }

  const stockColor =
    !product?.isStockTracked
      ? "var(--text-muted)"
      : product?.stock <= 0
        ? "var(--stock-out)"
        : product?.stock <= 5
          ? "var(--stock-low)"
          : "var(--stock-ok)";

  return (
    <PosAppShell title="">
      {/* Header */}
      <div className="detail-header">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate("/products")}>
          <ArrowLeft size={14} /> Produk
        </button>
        <span className="detail-header-title">
          {product?.name ?? `Produk #${id}`}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={load} title="Refresh">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-center" style={{ minHeight: 200 }}>
          <div className="spinner" />
        </div>
      ) : error ? (
        <div className="alert alert-warning">{error}</div>
      ) : !product ? null : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Left — product info */}
          <div>
            <div className="detail-card">
              <div className="detail-card-title">Informasi Produk</div>
              <div className="detail-row">
                <span className="detail-row-label">Nama</span>
                <span className="detail-row-value">{product.name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Kategori</span>
                <span className="detail-row-value">{product.categoryName ?? product.category ?? "—"}</span>
              </div>
              {product.sku && (
                <div className="detail-row">
                  <span className="detail-row-label">SKU</span>
                  <span className="detail-row-value" style={{ fontFamily: "monospace" }}>{product.sku}</span>
                </div>
              )}
              {product.barcode && (
                <div className="detail-row">
                  <span className="detail-row-label">Barcode</span>
                  <span className="detail-row-value" style={{ fontFamily: "monospace" }}>{product.barcode}</span>
                </div>
              )}
              {product.unitName && (
                <div className="detail-row">
                  <span className="detail-row-label">Satuan</span>
                  <span className="detail-row-value">{product.unitName}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-row-label">Harga Jual</span>
                <span className="detail-row-value" style={{ color: "var(--primary-dark)", fontSize: 15 }}>
                  Rp{fmt(product.price)}
                </span>
              </div>
              {product.costPrice != null && (
                <div className="detail-row">
                  <span className="detail-row-label">HPP / Modal</span>
                  <span className="detail-row-value">Rp{fmt(product.costPrice)}</span>
                </div>
              )}
              {product.costPrice != null && product.price > 0 && (
                <div className="detail-row">
                  <span className="detail-row-label">Margin</span>
                  <span className="detail-row-value" style={{ color: "var(--stock-ok)" }}>
                    {(((product.price - product.costPrice) / product.price) * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right — stock + status */}
          <div>
            <div className="detail-card">
              <div className="detail-card-title">Stok & Status</div>

              {/* Stock */}
              <div className="detail-row">
                <span className="detail-row-label">Lacak Stok</span>
                <span className="detail-row-value">
                  {product.isStockTracked !== false ? "Ya" : "Tidak (Layanan)"}
                </span>
              </div>
              <div className="detail-row" style={{ alignItems: "flex-start" }}>
                <span className="detail-row-label" style={{ paddingTop: 4 }}>Stok Saat Ini</span>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  {editingStock ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        value={stockVal}
                        onChange={(e) => setStockVal(e.target.value)}
                        style={{ width: 90, padding: "4px 8px", textAlign: "center" }}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveStock();
                          if (e.key === "Escape") setEditingStock(false);
                        }}
                      />
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={handleSaveStock}
                        disabled={savingStock}
                      >
                        {savingStock ? "…" : <Save size={12} />}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setEditingStock(false)}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span
                        className="detail-row-value"
                        style={{ fontSize: 22, fontWeight: 800, color: stockColor }}
                      >
                        {product.isStockTracked !== false ? product.stock : "∞"}
                      </span>
                      {product.isStockTracked !== false && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setStockVal(String(product.stock));
                            setEditingStock(true);
                          }}
                        >
                          Edit Stok
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Stock badge */}
              {product.isStockTracked !== false && (
                <div className="detail-row">
                  <span className="detail-row-label">Status Stok</span>
                  <span
                    className={`stock-badge ${
                      product.stock <= 0
                        ? "stock-badge--out"
                        : product.stock <= 5
                          ? "stock-badge--low"
                          : "stock-badge--ok"
                    }`}
                  >
                    {product.stock <= 0 ? "Habis" : product.stock <= 5 ? "Menipis" : "OK"}
                  </span>
                </div>
              )}

              {/* Active toggle */}
              <div className="detail-row">
                <span className="detail-row-label">Tampil di Kasir</span>
                <button
                  className={`btn btn-sm ${product.isActive !== false ? "btn-primary" : "btn-ghost"}`}
                  onClick={handleToggleActive}
                  disabled={toggling}
                  style={{ minWidth: 90 }}
                >
                  {toggling ? "…" : product.isActive !== false ? "Aktif" : "Nonaktif"}
                </button>
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div className="detail-card">
                <div className="detail-card-title">Deskripsi</div>
                <div style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-secondary)" }}>
                  {product.description}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </PosAppShell>
  );
}
