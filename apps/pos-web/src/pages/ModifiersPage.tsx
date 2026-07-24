// apps/pos-web/src/pages/ModifiersPage.tsx
//
// Phase 12 — Modifier groups & options manager.
// Terminology in UI uses "Modifier" so it works for cafe/restaurant alike.
// Group example: "Topping", "Level Pedas".
// Option example: "Boba (+5000)", "Pedas Sedang".

import { FormEvent, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Edit3,
  Layers,
  Plus,
  Save,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import { useApi } from "../hooks/useApi";
import {
  ModifierGroup,
  ModifierOption,
  addModifierOption,
  createModifierGroup,
  deactivateModifierGroup,
  getModifierGroups,
  removeModifierOption,
  updateModifierGroup,
  updateModifierOption,
} from "../services/api";
import { useToast } from "../store/toast.store";
import { fmt } from "../utils/fmt";

interface GroupForm {
  name: string;
  description: string;
  selectionType: "single" | "multiple";
  isRequired: boolean;
  minSelect: string;
  maxSelect: string;
  sortOrder: string;
}

const emptyGroupForm: GroupForm = {
  name: "",
  description: "",
  selectionType: "single",
  isRequired: false,
  minSelect: "0",
  maxSelect: "",
  sortOrder: "0",
};

interface OptionForm {
  groupId: number | null;
  optionId: number | null;
  name: string;
  priceDelta: string;
  sortOrder: string;
}

const emptyOptionForm: OptionForm = {
  groupId: null,
  optionId: null,
  name: "",
  priceDelta: "0",
  sortOrder: "0",
};

export default function ModifiersPage() {
  const toast = useToast();
  const groups = useApi(() => getModifierGroups(true), [], {
    autoRefreshMs: 30_000,
  });

  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ModifierGroup | null>(null);
  const [groupForm, setGroupForm] = useState<GroupForm>(emptyGroupForm);

  const [optionForm, setOptionForm] = useState<OptionForm>(emptyOptionForm);
  const [showOptionFormFor, setShowOptionFormFor] = useState<number | null>(
    null,
  );

  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  const rows = groups.data ?? [];

  const stats = useMemo(() => {
    const active = rows.filter((g) => g.isActive);
    const totalOptions = active.reduce(
      (sum, g) => sum + g.options.filter((o) => o.isActive).length,
      0,
    );
    const required = active.filter((g) => g.isRequired).length;
    return {
      total: rows.length,
      active: active.length,
      options: totalOptions,
      required,
    };
  }, [rows]);

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openGroupForm(group: ModifierGroup | null) {
    setEditingGroup(group);
    setGroupForm({
      name: group?.name ?? "",
      description: group?.description ?? "",
      selectionType: group?.selectionType ?? "single",
      isRequired: group?.isRequired ?? false,
      minSelect: String(group?.minSelect ?? 0),
      maxSelect: group?.maxSelect != null ? String(group.maxSelect) : "",
      sortOrder: String(group?.sortOrder ?? 0),
    });
    setShowGroupForm(true);
  }

  function resetGroupForm() {
    setEditingGroup(null);
    setGroupForm(emptyGroupForm);
    setShowGroupForm(false);
  }

  async function submitGroup(event: FormEvent) {
    event.preventDefault();
    const name = groupForm.name.trim();
    if (!name) {
      toast.warning("Nama grup modifier wajib diisi");
      return;
    }

    const min = Number(groupForm.minSelect) || 0;
    const max = groupForm.maxSelect ? Number(groupForm.maxSelect) : null;
    if (max !== null && max < min) {
      toast.error("Maks pilihan tidak boleh kurang dari min");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        description: groupForm.description.trim(),
        selectionType: groupForm.selectionType,
        isRequired: groupForm.isRequired,
        minSelect: min,
        maxSelect: max,
        sortOrder: Number(groupForm.sortOrder) || 0,
      };
      if (editingGroup) {
        await updateModifierGroup(editingGroup.id, payload);
        toast.success(`Grup "${name}" diperbarui`);
      } else {
        await createModifierGroup(payload);
        toast.success(`Grup "${name}" dibuat`);
      }
      resetGroupForm();
      groups.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan grup");
    } finally {
      setSaving(false);
    }
  }

  async function deactivateGroup(group: ModifierGroup) {
    if (!confirm(`Nonaktifkan grup "${group.name}"?`)) return;
    setSaving(true);
    try {
      await deactivateModifierGroup(group.id);
      toast.success("Grup dinonaktifkan");
      groups.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menonaktifkan");
    } finally {
      setSaving(false);
    }
  }

  function openOptionForm(group: ModifierGroup, option: ModifierOption | null) {
    setShowOptionFormFor(group.id);
    setOptionForm({
      groupId: group.id,
      optionId: option?.id ?? null,
      name: option?.name ?? "",
      priceDelta: String(option?.priceDelta ?? 0),
      sortOrder: String(option?.sortOrder ?? group.options.length),
    });
    setExpanded((prev) => new Set([...prev, group.id]));
  }

  function resetOptionForm() {
    setOptionForm(emptyOptionForm);
    setShowOptionFormFor(null);
  }

  async function submitOption(event: FormEvent) {
    event.preventDefault();
    if (!optionForm.groupId) return;
    const name = optionForm.name.trim();
    if (!name) {
      toast.warning("Nama opsi wajib diisi");
      return;
    }
    const priceDelta = Number(optionForm.priceDelta) || 0;
    const sortOrder = Number(optionForm.sortOrder) || 0;

    setSaving(true);
    try {
      if (optionForm.optionId) {
        await updateModifierOption(optionForm.optionId, {
          name,
          priceDelta,
          sortOrder,
        });
        toast.success("Opsi diperbarui");
      } else {
        await addModifierOption(optionForm.groupId, {
          name,
          priceDelta,
          sortOrder,
        });
        toast.success("Opsi ditambahkan");
      }
      resetOptionForm();
      groups.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan opsi");
    } finally {
      setSaving(false);
    }
  }

  async function deleteOption(option: ModifierOption) {
    if (!confirm(`Hapus opsi "${option.name}"?`)) return;
    setSaving(true);
    try {
      await removeModifierOption(option.id);
      toast.success("Opsi dihapus");
      groups.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus opsi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PosAppShell title="Modifier">
      <div
        className="summary-grid"
        style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}
      >
        <div className="summary-card">
          <div className="summary-card-label">
            <Layers size={13} /> Total Grup
          </div>
          <div className="summary-card-value">{stats.total}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <CheckCircle2 size={13} color="var(--stock-ok)" /> Aktif
          </div>
          <div
            className="summary-card-value"
            style={{ color: "var(--stock-ok)" }}
          >
            {stats.active}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <Tag size={13} color="var(--info)" /> Total Opsi
          </div>
          <div className="summary-card-value" style={{ color: "var(--info)" }}>
            {stats.options}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <AlertCircle size={13} color="var(--stock-low)" /> Wajib Pilih
          </div>
          <div
            className="summary-card-value"
            style={{ color: "var(--stock-low)" }}
          >
            {stats.required}
          </div>
        </div>
      </div>

      <div className="dashboard-card" style={{ marginBottom: 16 }}>
        <div
          className="dashboard-card-header"
          style={{ gap: 8, flexWrap: "wrap" }}
        >
          <Layers size={14} color="var(--text-muted)" />
          <strong style={{ fontSize: 13 }}>Grup Modifier</strong>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {rows.length} grup
          </span>
          <div style={{ marginLeft: "auto" }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => openGroupForm(null)}
            >
              <Plus size={13} /> Grup Baru
            </button>
          </div>
        </div>

        {showGroupForm && (
          <form onSubmit={submitGroup} className="management-form">
            <div className="form-group">
              <label className="form-label">Nama Grup *</label>
              <input
                className="form-input"
                value={groupForm.name}
                onChange={(e) =>
                  setGroupForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Contoh: Topping, Level Pedas"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tipe Pilihan</label>
              <select
                className="form-input"
                value={groupForm.selectionType}
                onChange={(e) =>
                  setGroupForm((p) => ({
                    ...p,
                    selectionType: e.target.value as "single" | "multiple",
                  }))
                }
              >
                <option value="single">Pilih satu (radio)</option>
                <option value="multiple">Pilih banyak (checkbox)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Wajib Pilih</label>
              <select
                className="form-input"
                value={groupForm.isRequired ? "yes" : "no"}
                onChange={(e) =>
                  setGroupForm((p) => ({
                    ...p,
                    isRequired: e.target.value === "yes",
                  }))
                }
              >
                <option value="no">Tidak</option>
                <option value="yes">Ya</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: "span 3" }}>
              <label className="form-label">Deskripsi</label>
              <input
                className="form-input"
                value={groupForm.description}
                onChange={(e) =>
                  setGroupForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Catatan untuk staf (opsional)"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Min Pilih</label>
              <input
                className="form-input"
                type="number"
                min="0"
                value={groupForm.minSelect}
                onChange={(e) =>
                  setGroupForm((p) => ({ ...p, minSelect: e.target.value }))
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">Maks Pilih</label>
              <input
                className="form-input"
                type="number"
                min="0"
                value={groupForm.maxSelect}
                onChange={(e) =>
                  setGroupForm((p) => ({ ...p, maxSelect: e.target.value }))
                }
                placeholder="Kosong = tak terbatas"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Urutan</label>
              <input
                className="form-input"
                type="number"
                value={groupForm.sortOrder}
                onChange={(e) =>
                  setGroupForm((p) => ({ ...p, sortOrder: e.target.value }))
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
                <Save size={13} /> {editingGroup ? "Simpan" : "Buat Grup"}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={resetGroupForm}
              >
                <X size={13} /> Batal
              </button>
            </div>
          </form>
        )}

        <div className="dashboard-card-body" style={{ padding: 0 }}>
          {groups.loading && rows.length === 0 ? (
            <div
              style={{
                padding: 24,
                color: "var(--text-muted)",
                textAlign: "center",
              }}
            >
              Memuat…
            </div>
          ) : rows.length === 0 ? (
            <div
              style={{
                padding: 28,
                color: "var(--text-muted)",
                textAlign: "center",
              }}
            >
              Belum ada grup modifier. Klik "Grup Baru" untuk mulai.
            </div>
          ) : (
            <div>
              {rows.map((group) => {
                const isOpen = expanded.has(group.id);
                const activeOptions = group.options.filter((o) => o.isActive);
                return (
                  <div
                    key={group.id}
                    style={{
                      borderTop: "1px solid var(--border)",
                      opacity: group.isActive ? 1 : 0.55,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 18px",
                        cursor: "pointer",
                      }}
                      onClick={() => toggleExpand(group.id)}
                    >
                      {isOpen ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontWeight: 600,
                            fontSize: 13.5,
                          }}
                        >
                          {group.name}
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color:
                                group.selectionType === "single"
                                  ? "var(--info)"
                                  : "#7c3aed",
                              background:
                                group.selectionType === "single"
                                  ? "var(--primary-light)"
                                  : "rgba(139,92,246,0.12)",
                              padding: "2px 6px",
                              borderRadius: 8,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            {group.selectionType === "single"
                              ? "Satu"
                              : "Banyak"}
                          </span>
                          {group.isRequired && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: "var(--stock-low)",
                                background: "var(--stock-low-bg)",
                                padding: "2px 6px",
                                borderRadius: 8,
                                textTransform: "uppercase",
                              }}
                            >
                              Wajib
                            </span>
                          )}
                          {!group.isActive && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: "var(--text-muted)",
                                background: "var(--bg-elevated)",
                                padding: "2px 6px",
                                borderRadius: 8,
                              }}
                            >
                              Nonaktif
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text-muted)",
                            marginTop: 2,
                          }}
                        >
                          {activeOptions.length} opsi · min {group.minSelect}
                          {group.maxSelect != null
                            ? ` · maks ${group.maxSelect}`
                            : " · tak terbatas"}
                          {group.description ? ` · ${group.description}` : ""}
                        </div>
                      </div>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openOptionForm(group, null);
                        }}
                        title="Tambah opsi"
                      >
                        <Plus size={13} /> Opsi
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openGroupForm(group);
                        }}
                        title="Edit grup"
                      >
                        <Edit3 size={13} />
                      </button>
                      {group.isActive && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deactivateGroup(group);
                          }}
                          title="Nonaktifkan grup"
                          style={{ color: "var(--stock-out)" }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    {isOpen && (
                      <div style={{ padding: "0 18px 14px 36px" }}>
                        {showOptionFormFor === group.id && (
                          <form
                            onSubmit={submitOption}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "2fr 1fr 1fr auto auto",
                              gap: 8,
                              padding: 10,
                              marginBottom: 10,
                              background: "var(--bg-elevated)",
                              border: "1px solid var(--border)",
                              borderRadius: "var(--radius-sm)",
                            }}
                          >
                            <input
                              className="form-input"
                              placeholder="Nama opsi *"
                              value={optionForm.name}
                              onChange={(e) =>
                                setOptionForm((p) => ({
                                  ...p,
                                  name: e.target.value,
                                }))
                              }
                              autoFocus
                            />
                            <input
                              className="form-input"
                              type="number"
                              placeholder="Tambahan harga"
                              value={optionForm.priceDelta}
                              onChange={(e) =>
                                setOptionForm((p) => ({
                                  ...p,
                                  priceDelta: e.target.value,
                                }))
                              }
                            />
                            <input
                              className="form-input"
                              type="number"
                              placeholder="Urutan"
                              value={optionForm.sortOrder}
                              onChange={(e) =>
                                setOptionForm((p) => ({
                                  ...p,
                                  sortOrder: e.target.value,
                                }))
                              }
                            />
                            <button
                              type="submit"
                              className="btn btn-primary btn-sm"
                              disabled={saving}
                            >
                              <Save size={12} />{" "}
                              {optionForm.optionId ? "Simpan" : "Tambah"}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={resetOptionForm}
                            >
                              <X size={12} />
                            </button>
                          </form>
                        )}

                        {activeOptions.length === 0 ? (
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--text-muted)",
                              padding: "8px 0",
                            }}
                          >
                            Belum ada opsi. Klik "Opsi" untuk menambah pilihan.
                          </div>
                        ) : (
                          <table
                            className="data-table"
                            style={{ width: "100%" }}
                          >
                            <thead>
                              <tr>
                                <th style={{ width: "55%" }}>Nama Opsi</th>
                                <th
                                  style={{ width: "20%", textAlign: "right" }}
                                >
                                  Tambahan Harga
                                </th>
                                <th
                                  style={{ width: "10%", textAlign: "center" }}
                                >
                                  Urutan
                                </th>
                                <th
                                  style={{ width: "15%", textAlign: "right" }}
                                >
                                  Aksi
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {activeOptions.map((option) => (
                                <tr key={option.id}>
                                  <td>{option.name}</td>
                                  <td style={{ textAlign: "right" }}>
                                    {option.priceDelta === 0
                                      ? "—"
                                      : `+Rp${fmt(option.priceDelta)}`}
                                  </td>
                                  <td style={{ textAlign: "center" }}>
                                    {option.sortOrder}
                                  </td>
                                  <td style={{ textAlign: "right" }}>
                                    <button
                                      className="btn btn-ghost btn-sm"
                                      onClick={() =>
                                        openOptionForm(group, option)
                                      }
                                      title="Edit opsi"
                                    >
                                      <Edit3 size={12} />
                                    </button>
                                    <button
                                      className="btn btn-ghost btn-sm"
                                      onClick={() => deleteOption(option)}
                                      title="Hapus opsi"
                                      style={{ color: "var(--stock-out)" }}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PosAppShell>
  );
}
