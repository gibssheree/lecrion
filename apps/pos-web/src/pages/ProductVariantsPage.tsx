import { FormEvent, useMemo, useState } from "react";
import { Layers3, Plus, Save, Search, Trash2, X } from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import { useApi } from "../hooks/useApi";
import {
  ProductVariant,
  createProductVariant,
  getProductVariants,
  getProducts,
  removeProductVariant,
} from "../services/api";
import { useToast } from "../store/toast.store";
import { fmt } from "../utils/fmt";

const VARIANT_TYPES = [
  { value: "size", label: "Ukuran" },
  { value: "color", label: "Warna" },
  { value: "material", label: "Material" },
  { value: "grade", label: "Grade" },
  { value: "custom", label: "Lainnya" },
];

interface VariantForm {
  variantProductId: string;
  variantType: string;
  variantValue: string;
}

const emptyForm: VariantForm = {
  variantProductId: "",
  variantType: "size",
  variantValue: "",
};

export default function ProductVariantsPage() {
  const toast = useToast();
  const products = useApi(getProducts, []);
  const [parentId, setParentId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const variants = useApi(
    () =>
      parentId
        ? getProductVariants(parentId)
        : Promise.resolve({ variants: [] }),
    [parentId],
  );

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<VariantForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const productList = (products.data?.products ?? []) as Array<{
    id: number;
    name: string;
    sku?: string | null;
    price?: number;
    stock?: number;
  }>;

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return productList;
    return productList.filter((product) =>
      product.name.toLowerCase().includes(search.trim().toLowerCase()),
    );
  }, [productList, search]);

  const variantList = (variants.data?.variants ?? []) as ProductVariant[];

  const childCandidates = useMemo(
    () =>
      productList.filter(
        (product) =>
          product.id !== parentId &&
          !variantList.some((v) => v.variantProductId === product.id),
      ),
    [productList, parentId, variantList],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!parentId) return;
    if (!form.variantProductId) {
      toast.warning("Pilih produk varian (child)");
      return;
    }
    if (!form.variantValue.trim()) {
      toast.warning("Nilai varian wajib diisi");
      return;
    }
    setSaving(true);
    try {
      await createProductVariant(parentId, {
        variantProductId: Number(form.variantProductId),
        variantType: form.variantType,
        variantValue: form.variantValue.trim(),
      });
      toast.success("Varian dibuat");
      setForm(emptyForm);
      setShowForm(false);
      variants.reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menyimpan varian",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(variant: ProductVariant) {
    if (!confirm(`Hapus link varian "${variant.variantValue}"?`)) return;
    setSaving(true);
    try {
      await removeProductVariant(variant.id);
      toast.success("Link varian dinonaktifkan");
      variants.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PosAppShell title="Varian Produk">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(300px, 360px) 1fr",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        {/* Parent selector */}
        <div className="dashboard-card">
          <div className="dashboard-card-header" style={{ gap: 8 }}>
            <Layers3 size={14} color="var(--text-muted)" />
            <strong style={{ fontSize: 13 }}>Pilih Produk Utama</strong>
          </div>
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <input
              className="form-input"
              placeholder="Cari produk…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ maxHeight: 480, overflowY: "auto" }}>
            {filteredProducts.map((product) => {
              const isActive = parentId === product.id;
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => {
                    setParentId(product.id);
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
                    }}
                  >
                    SKU: {product.sku || "—"} · Rp{fmt(product.price ?? 0)} ·
                    Stok {fmt(product.stock ?? 0)}
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

        {/* Variants list */}
        <div className="dashboard-card">
          <div
            className="dashboard-card-header"
            style={{ gap: 8, flexWrap: "wrap" }}
          >
            <Layers3 size={14} color="var(--text-muted)" />
            <strong style={{ fontSize: 13 }}>
              Varian{" "}
              {parentId
                ? `untuk: ${productList.find((p) => p.id === parentId)?.name ?? `#${parentId}`}`
                : "(pilih produk dulu)"}
            </strong>
            {parentId && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowForm((v) => !v)}
                style={{ marginLeft: "auto" }}
              >
                <Plus size={13} /> Tambah Varian
              </button>
            )}
          </div>

          {showForm && parentId && (
            <form onSubmit={submit} className="management-form">
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label className="form-label">Produk Varian (child) *</label>
                <select
                  className="form-select"
                  value={form.variantProductId}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      variantProductId: e.target.value,
                    }))
                  }
                >
                  <option value="">Pilih produk yang menjadi varian</option>
                  {childCandidates.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tipe</label>
                <select
                  className="form-select"
                  value={form.variantType}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      variantType: e.target.value,
                    }))
                  }
                >
                  {VARIANT_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Nilai *</label>
                <input
                  className="form-input"
                  value={form.variantValue}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      variantValue: e.target.value,
                    }))
                  }
                  placeholder="Misal: L, Merah, Grade A"
                />
              </div>
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
            {!parentId ? (
              <div
                style={{
                  padding: 32,
                  textAlign: "center",
                  color: "var(--text-muted)",
                }}
              >
                Pilih produk utama di kiri untuk melihat dan mengelola varian.
              </div>
            ) : variants.loading ? (
              <div className="loading-center">
                <div className="spinner" />
              </div>
            ) : (
              <table className="pos-data-table">
                <thead>
                  <tr>
                    <th>Tipe</th>
                    <th>Nilai</th>
                    <th>Produk Varian</th>
                    <th>Harga</th>
                    <th>Stok</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {variantList.map((variant) => (
                    <tr key={variant.id}>
                      <td>
                        <span className="chip" style={{ fontSize: 11 }}>
                          {VARIANT_TYPES.find(
                            (t) => t.value === variant.variantType,
                          )?.label ?? variant.variantType}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {variant.variantValue}
                      </td>
                      <td>
                        {variant.variantProduct.name}
                        {variant.variantProduct.sku && (
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--text-muted)",
                            }}
                          >
                            SKU: {variant.variantProduct.sku}
                          </div>
                        )}
                      </td>
                      <td>Rp{fmt(variant.variantProduct.price)}</td>
                      <td>{fmt(variant.variantProduct.stock)}</td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => remove(variant)}
                          disabled={saving}
                        >
                          <Trash2 size={12} /> Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!variantList.length && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          textAlign: "center",
                          color: "var(--text-muted)",
                          padding: 24,
                        }}
                      >
                        Belum ada varian untuk produk ini.
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
