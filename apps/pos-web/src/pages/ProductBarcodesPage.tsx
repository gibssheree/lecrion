import { FormEvent, useMemo, useState } from "react";
import { Barcode, Plus, Save, ScanLine, Search, Trash2, X } from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import { useApi } from "../hooks/useApi";
import {
  ProductBarcode,
  addProductBarcode,
  getProductBarcodes,
  getProducts,
  removeProductBarcode,
} from "../services/api";
import { useToast } from "../store/toast.store";
import Select from "../components/ui/Select";
import Checkbox from "../components/ui/Checkbox";
import { confirmDialog } from "../store/confirm.store";

const BARCODE_TYPES = [
  { value: "ean13", label: "EAN-13" },
  { value: "ean8", label: "EAN-8" },
  { value: "code128", label: "Code 128" },
  { value: "qr", label: "QR Code" },
  { value: "internal", label: "Internal SKU" },
  { value: "custom", label: "Lainnya" },
];

interface BarcodeForm {
  barcode: string;
  barcodeType: string;
  isPrimary: boolean;
}

const emptyForm: BarcodeForm = {
  barcode: "",
  barcodeType: "ean13",
  isPrimary: false,
};

export default function ProductBarcodesPage() {
  const toast = useToast();
  const products = useApi(getProducts, []);
  const [productId, setProductId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const barcodes = useApi(
    () =>
      productId
        ? getProductBarcodes(productId)
        : Promise.resolve({ barcodes: [] }),
    [productId],
  );

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<BarcodeForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const productList = (products.data?.products ?? []) as Array<{
    id: number;
    name: string;
    sku?: string | null;
    barcode?: string | null;
  }>;

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return productList;
    const lower = search.trim().toLowerCase();
    return productList.filter(
      (product) =>
        product.name.toLowerCase().includes(lower) ||
        product.sku?.toLowerCase().includes(lower) ||
        product.barcode?.toLowerCase().includes(lower),
    );
  }, [productList, search]);

  const barcodeList = (barcodes.data?.barcodes ?? []) as ProductBarcode[];
  const selectedProduct = productList.find((p) => p.id === productId);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!productId) return;
    if (!form.barcode.trim()) {
      toast.warning("Barcode wajib diisi");
      return;
    }
    setSaving(true);
    try {
      await addProductBarcode(productId, {
        barcode: form.barcode.trim(),
        barcodeType: form.barcodeType,
        isPrimary: form.isPrimary,
      });
      toast.success(`Barcode "${form.barcode}" ditambahkan`);
      setForm(emptyForm);
      setShowForm(false);
      barcodes.reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menambahkan barcode",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(barcode: ProductBarcode) {
    if (!(await confirmDialog({ title: `Hapus barcode "${barcode.barcode}"?`, danger: true }))) return;
    setSaving(true);
    try {
      await removeProductBarcode(barcode.id);
      toast.success("Barcode dihapus");
      barcodes.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PosAppShell title="Barcode / SKU">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(300px, 360px) 1fr",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        {/* Product picker */}
        <div className="dashboard-card">
          <div className="dashboard-card-header" style={{ gap: 8 }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              className="form-input"
              placeholder="Cari produk / SKU / barcode…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
          <div style={{ maxHeight: 480, overflowY: "auto" }}>
            {filteredProducts.map((product) => {
              const isActive = productId === product.id;
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => {
                    setProductId(product.id);
                    setShowForm(false);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 14px",
                    background: isActive
                      ? "var(--primary-light)"
                      : "transparent",
                    border: "none",
                    borderBottom: "1px solid var(--border)",
                    cursor: "pointer",
                    color: isActive ? "var(--primary)" : "var(--text-primary)",
                    fontWeight: isActive ? 700 : 500,
                    fontSize: 13,
                  }}
                >
                  <div>{product.name}</div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      fontWeight: 500,
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    {product.sku && <span>SKU: {product.sku}</span>}
                    {product.barcode && (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <ScanLine size={10} /> {product.barcode}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
            {!filteredProducts.length && (
              <div
                style={{
                  padding: 16,
                  textAlign: "center",
                  color: "var(--text-muted)",
                }}
              >
                Tidak ada produk
              </div>
            )}
          </div>
        </div>

        {/* Barcodes list */}
        <div className="dashboard-card">
          <div
            className="dashboard-card-header"
            style={{ gap: 8, flexWrap: "wrap" }}
          >
            <Barcode size={14} color="var(--text-muted)" />
            <strong style={{ fontSize: 13 }}>
              Barcode{" "}
              {selectedProduct ? `— ${selectedProduct.name}` : "(pilih produk)"}
            </strong>
            {productId && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowForm((v) => !v)}
                style={{ marginLeft: "auto" }}
              >
                <Plus size={13} /> Tambah Barcode
              </button>
            )}
          </div>

          {productId && selectedProduct?.barcode && (
            <div
              style={{
                padding: "10px 16px",
                background: "var(--primary-light)",
                borderBottom: "1px solid var(--border)",
                fontSize: 12,
                color: "var(--text-secondary)",
              }}
            >
              Barcode utama (di tabel produk):{" "}
              <strong style={{ color: "var(--primary)" }}>
                {selectedProduct.barcode}
              </strong>{" "}
              — atur via halaman Produk.
            </div>
          )}

          {showForm && productId && (
            <form onSubmit={submit} className="management-form">
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label className="form-label">Barcode *</label>
                <input
                  className="form-input"
                  value={form.barcode}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, barcode: e.target.value }))
                  }
                  placeholder="Scan atau ketik barcode"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tipe</label>
                <Select
                  value={form.barcodeType}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      barcodeType: e.target.value,
                    }))
                  }
                >
                  {BARCODE_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <Checkbox
                checked={form.isPrimary}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    isPrimary: e.target.checked,
                  }))
                }
                label="Primer"
                style={{ alignSelf: "flex-end" }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  gridColumn: "1 / -1",
                }}
              >
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setShowForm(false);
                    setForm(emptyForm);
                  }}
                >
                  <X size={13} /> Batal
                </button>
                <button className="btn btn-primary btn-sm" disabled={saving}>
                  <Save size={13} /> Simpan
                </button>
              </div>
            </form>
          )}

          <div className="dashboard-card-body" style={{ padding: 0 }}>
            {!productId ? (
              <div
                style={{
                  padding: 32,
                  textAlign: "center",
                  color: "var(--text-muted)",
                }}
              >
                Pilih produk di kiri untuk melihat dan mengelola barcode
                tambahan.
              </div>
            ) : barcodes.loading ? (
              <div className="loading-center">
                <div className="spinner" />
              </div>
            ) : (
              <table className="pos-data-table">
                <thead>
                  <tr>
                    <th>Barcode</th>
                    <th>Tipe</th>
                    <th>Primer</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {barcodeList.map((barcode) => (
                    <tr key={barcode.id}>
                      <td
                        style={{
                          fontFamily: "monospace",
                          fontWeight: 600,
                          fontSize: 13,
                        }}
                      >
                        {barcode.barcode}
                      </td>
                      <td>
                        <span className="chip" style={{ fontSize: 11 }}>
                          {BARCODE_TYPES.find(
                            (t) => t.value === barcode.barcodeType,
                          )?.label ?? barcode.barcodeType}
                        </span>
                      </td>
                      <td>
                        {barcode.isPrimary ? (
                          <span className="stock-badge stock-badge--ok">
                            Primer
                          </span>
                        ) : (
                          <span className="stock-badge stock-badge--service">
                            Sekunder
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => remove(barcode)}
                          disabled={saving}
                        >
                          <Trash2 size={12} /> Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!barcodeList.length && (
                    <tr>
                      <td
                        colSpan={4}
                        style={{
                          textAlign: "center",
                          color: "var(--text-muted)",
                          padding: 24,
                        }}
                      >
                        Belum ada barcode tambahan untuk produk ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </PosAppShell>
  );
}
