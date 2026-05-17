import { FormEvent, useMemo, useState } from "react";
import { FolderTree, Plus, Save, Trash2, X } from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import {
  ProductCategory,
  createCategory,
  deactivateCategory,
  getCategories,
  updateCategory,
} from "../services/api";
import { useApi } from "../hooks/useApi";

type CategoryForm = {
  name: string;
  slug: string;
  description: string;
  parentId: string;
  sortOrder: string;
  isActive: boolean;
};

const emptyForm: CategoryForm = {
  name: "",
  slug: "",
  description: "",
  parentId: "",
  sortOrder: "0",
  isActive: true,
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function toForm(category: ProductCategory): CategoryForm {
  return {
    name: category.name,
    slug: category.slug,
    description: category.description ?? "",
    parentId: category.parentId == null ? "" : String(category.parentId),
    sortOrder: String(category.sortOrder ?? 0),
    isActive: category.isActive !== false,
  };
}

export default function CategoriesPage() {
  const categories = useApi(() => getCategories(), []);
  const rows = categories.data?.categories ?? [];
  const [editing, setEditing] = useState<ProductCategory | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(
    () => ({
      total: rows.length,
      root: rows.filter((item) => item.parentId == null).length,
      child: rows.filter((item) => item.parentId != null).length,
    }),
    [rows],
  );

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
    setError(null);
  }

  function openEdit(category: ProductCategory) {
    setEditing(category);
    setForm(toForm(category));
    setShowForm(true);
    setError(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Nama kategori wajib diisi.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || slugify(form.name),
        description: form.description.trim() || undefined,
        parentId: form.parentId ? Number(form.parentId) : null,
        sortOrder: Number(form.sortOrder || 0),
        isActive: form.isActive,
      };
      if (editing) await updateCategory(editing.id, payload);
      else await createCategory(payload);
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      categories.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(category: ProductCategory) {
    if (!confirm(`Nonaktifkan kategori "${category.name}"?`)) return;
    setSaving(true);
    try {
      await deactivateCategory(category.id);
      categories.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PosAppShell title="Kategori Produk">
      <div className="summary-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 16 }}>
        <div className="summary-card">
          <div className="summary-card-label"><FolderTree size={13} /> Total Kategori</div>
          <div className="summary-card-value">{stats.total}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Kategori Utama</div>
          <div className="summary-card-value">{stats.root}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Subkategori</div>
          <div className="summary-card-value">{stats.child}</div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <span><FolderTree size={14} /> Daftar Kategori</span>
          <button className="btn btn-primary btn-sm" onClick={openCreate} style={{ marginLeft: "auto" }}>
            <Plus size={13} /> Tambah Kategori
          </button>
        </div>

        {showForm && (
          <form onSubmit={submit} className="management-form">
            <div className="form-group">
              <label className="form-label">Nama *</label>
              <input
                className="form-input"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Slug</label>
              <input
                className="form-input"
                value={form.slug}
                onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                placeholder="otomatis dari nama"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Parent</label>
              <select
                className="form-select"
                value={form.parentId}
                onChange={(event) => setForm((prev) => ({ ...prev, parentId: event.target.value }))}
              >
                <option value="">Tanpa parent</option>
                {rows
                  .filter((item) => item.id !== editing?.id)
                  .map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Urutan</label>
              <input
                className="form-input"
                type="number"
                value={form.sortOrder}
                onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
              />
            </div>
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Deskripsi</label>
              <textarea
                className="form-textarea"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
              />
              <span className="form-label" style={{ margin: 0 }}>Aktif</span>
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>
                <X size={13} /> Batal
              </button>
              <button className="btn btn-primary btn-sm" disabled={saving}>
                <Save size={13} /> Simpan
              </button>
            </div>
          </form>
        )}

        <div className="dashboard-card-body" style={{ padding: 0 }}>
          {categories.loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            <table className="pos-data-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Slug</th>
                  <th>Parent</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((category) => {
                  const parent = rows.find((item) => item.id === category.parentId);
                  return (
                    <tr key={category.id}>
                      <td><strong>{category.name}</strong></td>
                      <td>{category.slug}</td>
                      <td>{parent?.name ?? "-"}</td>
                      <td>
                        <span className={`stock-badge ${category.isActive === false ? "stock-badge--service" : "stock-badge--ok"}`}>
                          {category.isActive === false ? "Nonaktif" : "Aktif"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(category)}>Edit</button>
                          {category.isActive !== false && (
                            <button className="btn btn-danger btn-sm" disabled={saving} onClick={() => deactivate(category)}>
                              <Trash2 size={12} /> Nonaktifkan
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!rows.length && (
                  <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)" }}>Belum ada kategori</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PosAppShell>
  );
}
