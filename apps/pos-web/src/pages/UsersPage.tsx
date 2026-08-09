import { FormEvent, useMemo, useState } from "react";
import { Plus, Save, ShieldCheck, Users as UsersIcon, X } from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import { PosUser, createUser, listUsers, updateUserRole } from "../services/api";
import { useApi } from "../hooks/useApi";
import { useAuthStore } from "../store/auth.store";
import { usePagination } from "../hooks/usePagination";
import Pagination from "../components/ui/Pagination";
import Select from "../components/ui/Select";

// 'support' is a platform-wide role (cross-tenant access) and is
// intentionally not assignable here — see auth.controller.ts VALID_ROLES.
const VALID_ROLES = [
  "owner",
  "manager",
  "cashier",
  "inventory_staff",
] as const;

type UserRole = (typeof VALID_ROLES)[number];

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  cashier: "Kasir",
  inventory_staff: "Inventori",
  support: "Support",
};

function roleClass(role: string): string {
  if (role === "owner") return "stock-badge--service";
  if (role === "manager") return "stock-badge--low";
  if (role === "cashier") return "stock-badge--ok";
  return "stock-badge--service";
}

export default function UsersPage() {
  const currentUser = useAuthStore((state) => state.user);
  const users = useApi(listUsers, []);
  const rows = users.data ?? [];
  const pagination = usePagination(rows, 20);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    role: "cashier" as UserRole,
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRole, setEditRole] = useState<UserRole>("cashier");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(
    () => ({
      total: rows.length,
      owner: rows.filter((item) => item.role === "owner").length,
      manager: rows.filter((item) => item.role === "manager").length,
      cashier: rows.filter((item) => item.role === "cashier").length,
    }),
    [rows],
  );

  async function submitCreate(event: FormEvent) {
    event.preventDefault();
    if (!createForm.email.trim() || !createForm.password) {
      setError("Email dan password wajib diisi.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createUser(createForm);
      setCreateForm({ email: "", password: "", role: "cashier" });
      setShowCreate(false);
      users.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function saveRole(user: PosUser) {
    setSaving(true);
    setError(null);
    try {
      await updateUserRole(user.id, { role: editRole });
      setEditingId(null);
      users.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  if (currentUser?.role !== "owner") {
    return (
      <PosAppShell title="Manajemen Pengguna">
        <div className="dashboard-card" style={{ textAlign: "center", padding: 48 }}>
          <ShieldCheck size={40} color="var(--text-muted)" />
          <div style={{ marginTop: 12, fontWeight: 700 }}>Hanya Owner yang dapat mengelola pengguna</div>
        </div>
      </PosAppShell>
    );
  }

  return (
    <PosAppShell title="Manajemen Pengguna">
      <div className="summary-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}>
        <div className="summary-card">
          <div className="summary-card-label"><UsersIcon size={13} /> Total Pengguna</div>
          <div className="summary-card-value">{stats.total}</div>
        </div>
        <div className="summary-card"><div className="summary-card-label">Owner</div><div className="summary-card-value">{stats.owner}</div></div>
        <div className="summary-card"><div className="summary-card-label">Manager</div><div className="summary-card-value">{stats.manager}</div></div>
        <div className="summary-card"><div className="summary-card-label">Kasir</div><div className="summary-card-value">{stats.cashier}</div></div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {error}
          <button className="btn btn-ghost btn-sm" onClick={() => setError(null)} style={{ marginLeft: "auto" }}>
            <X size={12} />
          </button>
        </div>
      )}

      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <span><UsersIcon size={14} /> Daftar Pengguna</span>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate((value) => !value)} style={{ marginLeft: "auto" }}>
            <Plus size={13} /> Tambah Pengguna
          </button>
        </div>

        {showCreate && (
          <form onSubmit={submitCreate} className="management-form">
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input
                className="form-input"
                type="email"
                value={createForm.email}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password *</label>
              <input
                className="form-input"
                type="password"
                minLength={6}
                value={createForm.password}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <Select
                value={createForm.role}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, role: event.target.value as UserRole }))}
              >
                {VALID_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
              </Select>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>
                <X size={13} /> Batal
              </button>
              <button className="btn btn-primary btn-sm" disabled={saving}>
                <Save size={13} /> Simpan
              </button>
            </div>
          </form>
        )}

        <div className="dashboard-card-body" style={{ padding: 0 }}>
          {users.loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            <table className="pos-data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Store</th>
                  <th>Dibuat</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pagination.slice.map((user) => (
                  <tr key={user.id}>
                    <td>#{user.id}</td>
                    <td><strong>{user.email}</strong></td>
                    <td>
                      {editingId === user.id ? (
                        <Select value={editRole} onChange={(event) => setEditRole(event.target.value as UserRole)}>
                          {VALID_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                        </Select>
                      ) : (
                        <span className={`stock-badge ${roleClass(user.role)}`}>{ROLE_LABELS[user.role] ?? user.role}</span>
                      )}
                    </td>
                    <td>{user.storeId}</td>
                    <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString("id-ID") : "-"}</td>
                    <td>
                      {editingId === user.id ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="btn btn-primary btn-sm" disabled={saving} onClick={() => saveRole(user)}>Simpan</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Batal</button>
                        </div>
                      ) : (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setEditingId(user.id);
                            setEditRole(user.role as UserRole);
                          }}
                        >
                          Edit Role
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)" }}>Belum ada pengguna</td></tr>
                )}
              </tbody>
            </table>
          )}
          <Pagination {...pagination} />
        </div>
      </div>
    </PosAppShell>
  );
}
