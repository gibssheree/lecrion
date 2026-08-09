import { FormEvent, useEffect, useState } from "react";
import { Save, X } from "lucide-react";
import {
  ProductCategory,
  createProduct,
  updateProduct,
} from "../../services/api";
import { Product } from "../../hooks/useProducts";
import Select from "../../components/ui/Select";
import Checkbox from "../../components/ui/Checkbox";

type FormState = {
  mode: "create" | "edit";
  productId: string;
  name: string;
  price: string;
  costPrice: string;
  stock: string;
  categoryId: string;
  sku: string;
  barcode: string;
  isStockTracked: boolean;
  isActive: boolean;
};

const emptyForm: FormState = {
  mode: "create",
  productId: "",
  name: "",
  price: "",
  costPrice: "",
  stock: "0",
  categoryId: "",
  sku: "",
  barcode: "",
  isStockTracked: true,
  isActive: true,
};

interface Props {
  products: Product[];
  categories: ProductCategory[];
  onClose: () => void;
  onSaved: () => void;
}

function formFromProduct(product: Product): FormState {
  return {
    mode: "edit",
    productId: String(product.id),
    name: product.name,
    price: String(product.price ?? ""),
    costPrice: product.costPrice == null ? "" : String(product.costPrice),
    stock: String(product.stock ?? 0),
    categoryId: product.categoryId == null ? "" : String(product.categoryId),
    sku: product.sku ?? "",
    barcode: product.barcode ?? "",
    isStockTracked: product.isStockTracked ?? true,
    isActive: product.isActive ?? true,
  };
}

function payload(form: FormState) {
  return {
    name: form.name.trim(),
    price: Number(form.price),
    costPrice: form.costPrice === "" ? null : Number(form.costPrice),
    stock: Number(form.stock || 0),
    categoryId: form.categoryId ? Number(form.categoryId) : null,
    sku: form.sku.trim() || undefined,
    barcode: form.barcode.trim() || undefined,
    productType: "simple",
    isStockTracked: form.isStockTracked,
    isActive: form.isActive,
  };
}

export default function QuickProductModal({
  products,
  categories,
  onClose,
  onSaved,
}: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (form.mode !== "edit" || !form.productId) return;
    const product = products.find((item) => String(item.id) === form.productId);
    if (product) setForm(formFromProduct(product));
  }, [form.mode, form.productId, products]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || Number(form.price) <= 0) {
      setError("Nama dan harga wajib diisi.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (form.mode === "edit") {
        await updateProduct(Number(form.productId), payload(form));
      } else {
        await createProduct(payload(form));
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(15,23,42,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: "min(680px, 100%)",
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          padding: 18,
          display: "grid",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <strong style={{ fontSize: 15, flex: 1 }}>Produk Cepat</strong>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={13} />
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div style={{ display: "flex", gap: 6 }}>
          {(["create", "edit"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`btn btn-sm ${form.mode === mode ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setForm({ ...emptyForm, mode })}
            >
              {mode === "create" ? "Tambah" : "Edit"}
            </button>
          ))}
        </div>

        {form.mode === "edit" && (
          <div className="form-group">
            <label className="form-label">Pilih Produk</label>
            <Select
              value={form.productId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, productId: event.target.value }))
              }
            >
              <option value="">Pilih produk</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gap: 10,
          }}
        >
          <div className="form-group">
            <label className="form-label">Nama *</label>
            <input
              className="form-input"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Harga *</label>
            <input
              className="form-input"
              type="number"
              min="0"
              value={form.price}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, price: event.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">HPP</label>
            <input
              className="form-input"
              type="number"
              min="0"
              value={form.costPrice}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, costPrice: event.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Stok</label>
            <input
              className="form-input"
              type="number"
              min="0"
              value={form.stock}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, stock: event.target.value }))
              }
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 10,
          }}
        >
          <div className="form-group">
            <label className="form-label">Kategori</label>
            <Select
              value={form.categoryId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, categoryId: event.target.value }))
              }
            >
              <option value="">Tanpa kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="form-group">
            <label className="form-label">SKU</label>
            <input
              className="form-input"
              value={form.sku}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, sku: event.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Barcode</label>
            <input
              className="form-input"
              value={form.barcode}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, barcode: event.target.value }))
              }
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Checkbox
            checked={form.isStockTracked}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                isStockTracked: event.target.checked,
              }))
            }
            label="Stok dilacak"
          />
          <Checkbox
            checked={form.isActive}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, isActive: event.target.checked }))
            }
            label="Aktif"
          />
          <button
            className="btn btn-primary btn-sm"
            disabled={saving || (form.mode === "edit" && !form.productId)}
            style={{ marginLeft: "auto" }}
          >
            <Save size={13} /> Simpan
          </button>
        </div>
      </form>
    </div>
  );
}
