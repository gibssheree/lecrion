import { FormEvent, useMemo, useState } from "react";
import { Plus, Save, Search, Trash2, Truck, X } from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import {
  Supplier,
  createSupplier,
  deactivateSupplier,
  getSuppliers,
  updateSupplier,
} from "../services/api";
import { useApi } from "../hooks/useApi";

type SupplierForm = {
  name: string;
  code: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  isActive: boolean;
};

const emptyForm: SupplierForm = {
  name: "",
  code: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  isActive: true,
};

function toForm(supplier: Supplier): SupplierForm {
  return {
    name: supplier.name,
    code: supplier.code ?? "",
    contactPerson: supplier.contactPerson ?? "",
    phone: supplier.phone ?? "",
    email: supplier.email ?? "",
    address: supplier.address ?? "",
    notes: supplier.notes ?? "",
    isActive: supplier.isActive,
  };
}

function payload(form: SupplierForm) {
  return {
    name: form.name.trim(),
    code: form.code.trim() || null,
    contactPerson: form.contactPerson.trim() || null,
    phone: form.phone.trim() || null,
    email: form.email.trim() || null,
    address: form.address.trim() || null,
    notes: form.notes.trim() || null,
    isActive: form.isActive,
  };
}

export default function SuppliersPage() {
  const [query, setQuery] = useState("");
  const suppliers = useApi(() => getSuppliers(true, query), [query]);
  const rows = suppliers.data ?? [];
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SupplierForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(
    () => ({
      total: rows.length,
      active: rows.filter((item) => item.isActive).length,
      inactive: rows.filter((item) => !item.isActive).length,
    }),
    [rows],
  );

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
    setError(null);
  }

  function openEdit(supplier: Supplier) {
    setEditing(supplier);
    setForm(toForm(supplier));
    setShowForm(true);
    setError(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Nama supplier wajib diisi.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editing) await updateSupplier(editing.id, payload(form));
      else await createSupplier(payload(form));
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      suppliers.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(supplier: Supplier) {
    if (!confirm(`Nonaktifkan supplier "${supplier.name}"?`)) return;
    setSaving(true);
    try {
      await deactivateSupplier(supplier.id);
      suppliers.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PosAppShell title="Manajemen Supplier">
      <div className="summary-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 16 }}>
        <div className="summary-card">
          <div className="summary-card-label"><Truck size={13} /> Total Supplier</div>
          <div className="summary-card-value">{stats.total}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Aktif</div>
          <div className="summary-card-value">{stats.active}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Nonaktif</div>
          <div className="summary-card-value">{stats.inactive}</div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="dashboard-card">
        <div className="dashboard-card-header" style={{ gap: 8 }}>
          <Search size={14} color="var(--text-muted)" />
          <input
            className="form-input"
            placeholder="Cari supplier, kode, telepon"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            style={{ width: 300 }}
          />
          <button className="btn btn-primary btn-sm" onClick={openCreate} style={{ marginLeft: "auto" }}>
            <Plus size={13} /> Tambah Supplier
          </button>
        </div>

        {showForm && (
          <form onSubmit={submit} className="management-form">
            <div className="form-group">
              <label className="form-label">Nama *</label>
              <input className="form-input" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Kode</label>
              <input className="form-input" value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Kontak</label>
              <input className="form-input" value={form.contactPerson} onChange={(event) => setForm((prev) => ({ ...prev, contactPerson: event.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Telepon</label>
              <input className="form-input" value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
            </div>
            <div className="form-group" style={{ gridColumn: "span 2" }}>
              <label className="form-label">Alamat</label>
              <input className="form-input" value={form.address} onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Catatan</label>
              <input className="form-input" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
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
          {suppliers.loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            <table className="pos-data-table">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Kontak</th>
                  <th>Telepon</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((supplier) => (
                  <tr key={supplier.id}>
                    <td>
                      <strong>{supplier.name}</strong>
                      <div style={{ color: "var(--text-muted)", fontSize: 11 }}>{supplier.code || "Tanpa kode"}</div>
                    </td>
                    <td>{supplier.contactPerson ?? "-"}</td>
                    <td>{supplier.phone ?? "-"}</td>
                    <td>{supplier.email ?? "-"}</td>
                    <td>
                      <span className={`stock-badge ${supplier.isActive ? "stock-badge--ok" : "stock-badge--service"}`}>
                        {supplier.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(supplier)}>Edit</button>
                        {supplier.isActive && (
                          <button className="btn btn-danger btn-sm" disabled={saving} onClick={() => deactivate(supplier)}>
                            <Trash2 size={12} /> Nonaktifkan
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)" }}>Belum ada supplier</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PosAppShell>
  );
}
