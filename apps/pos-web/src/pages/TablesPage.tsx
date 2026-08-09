import { FormEvent, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Layers,
  Plus,
  Save,
  Sparkles,
  Users,
  Utensils,
  X,
} from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import { useApi } from "../hooks/useApi";
import {
  DiningArea,
  DiningTable,
  createDiningArea,
  createDiningTable,
  deactivateDiningArea,
  getDiningAreas,
  getDiningTables,
  setDiningTableStatus,
  updateDiningArea,
  updateDiningTable,
} from "../services/api";
import { useToast } from "../store/toast.store";
import Select from "../components/ui/Select";
import { confirmDialog } from "../store/confirm.store";

const STATUS_META: Record<
  DiningTable["status"],
  { label: string; color: string; bg: string; icon: any }
> = {
  available: {
    label: "Tersedia",
    color: "var(--stock-ok)",
    bg: "var(--stock-ok-bg)",
    icon: CheckCircle2,
  },
  occupied: {
    label: "Terisi",
    color: "var(--stock-out)",
    bg: "var(--stock-out-bg)",
    icon: Users,
  },
  reserved: {
    label: "Reservasi",
    color: "var(--stock-low)",
    bg: "var(--stock-low-bg)",
    icon: Clock,
  },
  cleaning: {
    label: "Dibersihkan",
    color: "var(--info)",
    bg: "var(--primary-light)",
    icon: Sparkles,
  },
};

const STATUS_ORDER: DiningTable["status"][] = [
  "available",
  "occupied",
  "reserved",
  "cleaning",
];

interface TableFormState {
  tableNumber: string;
  capacity: string;
  areaId: string;
}

const emptyTableForm: TableFormState = {
  tableNumber: "",
  capacity: "4",
  areaId: "",
};

export default function TablesPage() {
  const toast = useToast();
  const areas = useApi(() => getDiningAreas("default-store"), []);
  const tables = useApi(() => getDiningTables("default-store"), [], {
    autoRefreshMs: 30_000,
  });

  const [showAreaForm, setShowAreaForm] = useState(false);
  const [areaName, setAreaName] = useState("");
  const [areaDesc, setAreaDesc] = useState("");
  const [editingArea, setEditingArea] = useState<DiningArea | null>(null);

  const [showTableForm, setShowTableForm] = useState(false);
  const [tableForm, setTableForm] = useState<TableFormState>(emptyTableForm);
  const [editingTable, setEditingTable] = useState<DiningTable | null>(null);

  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | DiningTable["status"]>("all");

  const rows = tables.data ?? [];
  const areaList = areas.data ?? [];

  const stats = useMemo(() => {
    const counts = STATUS_ORDER.reduce(
      (acc, status) => {
        acc[status] = 0;
        return acc;
      },
      { all: rows.length } as Record<string, number>,
    );
    for (const table of rows) {
      counts[table.status] = (counts[table.status] ?? 0) + 1;
    }
    return counts;
  }, [rows]);

  const filteredTables = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((table) => table.status === filter);
  }, [rows, filter]);

  function resetAreaForm() {
    setEditingArea(null);
    setAreaName("");
    setAreaDesc("");
    setShowAreaForm(false);
  }

  function openAreaForm(area: DiningArea | null) {
    setEditingArea(area);
    setAreaName(area?.name ?? "");
    setAreaDesc(area?.description ?? "");
    setShowAreaForm(true);
  }

  async function submitArea(event: FormEvent) {
    event.preventDefault();
    if (!areaName.trim()) {
      toast.warning("Nama area wajib diisi");
      return;
    }
    setSaving(true);
    try {
      if (editingArea) {
        await updateDiningArea(editingArea.id, {
          name: areaName.trim(),
          description: areaDesc.trim(),
        });
        toast.success(`Area "${areaName}" diperbarui`);
      } else {
        await createDiningArea({
          name: areaName.trim(),
          description: areaDesc.trim() || undefined,
        });
        toast.success(`Area "${areaName}" dibuat`);
      }
      resetAreaForm();
      areas.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan area");
    } finally {
      setSaving(false);
    }
  }

  async function deactivateArea(area: DiningArea) {
    if (!(await confirmDialog({ title: `Nonaktifkan area "${area.name}"?`, danger: true }))) return;
    setSaving(true);
    try {
      await deactivateDiningArea(area.id);
      toast.success("Area dinonaktifkan");
      areas.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menonaktifkan");
    } finally {
      setSaving(false);
    }
  }

  function resetTableForm() {
    setEditingTable(null);
    setTableForm(emptyTableForm);
    setShowTableForm(false);
  }

  function openTableForm(table: DiningTable | null) {
    setEditingTable(table);
    setTableForm({
      tableNumber: table?.table_number ?? "",
      capacity: String(table?.capacity ?? 4),
      areaId: table?.area_id ? String(table.area_id) : "",
    });
    setShowTableForm(true);
  }

  async function submitTable(event: FormEvent) {
    event.preventDefault();
    const tableNumber = tableForm.tableNumber.trim();
    if (!tableNumber) {
      toast.warning("Nomor meja wajib diisi");
      return;
    }
    const capacity = Number(tableForm.capacity) || 4;
    setSaving(true);
    try {
      if (editingTable) {
        await updateDiningTable(editingTable.id, {
          tableNumber,
          capacity,
          areaId: tableForm.areaId ? Number(tableForm.areaId) : null,
        });
        toast.success(`Meja "${tableNumber}" diperbarui`);
      } else {
        await createDiningTable({
          tableNumber,
          capacity,
          areaId: tableForm.areaId ? Number(tableForm.areaId) : null,
        });
        toast.success(`Meja "${tableNumber}" dibuat`);
      }
      resetTableForm();
      tables.reload();
      areas.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan meja");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(
    table: DiningTable,
    status: DiningTable["status"],
  ) {
    setSaving(true);
    try {
      await setDiningTableStatus(table.id, status);
      toast.success(
        `Meja "${table.table_number}" → ${STATUS_META[status].label}`,
      );
      tables.reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal mengubah status meja",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <PosAppShell title="Manajemen Meja">
      <div
        className="summary-grid"
        style={{ gridTemplateColumns: "repeat(5, 1fr)", marginBottom: 16 }}
      >
        <div className="summary-card">
          <div className="summary-card-label">
            <Utensils size={13} /> Total Meja
          </div>
          <div className="summary-card-value">{stats.all}</div>
        </div>
        {STATUS_ORDER.map((status) => {
          const meta = STATUS_META[status];
          const Icon = meta.icon;
          return (
            <div className="summary-card" key={status}>
              <div className="summary-card-label">
                <Icon size={13} color={meta.color} /> {meta.label}
              </div>
              <div className="summary-card-value" style={{ color: meta.color }}>
                {stats[status] ?? 0}
              </div>
            </div>
          );
        })}
      </div>

      {/* Status filter */}
      <div className="dashboard-card" style={{ marginBottom: 16 }}>
        <div
          className="dashboard-card-header"
          style={{ gap: 8, flexWrap: "wrap" }}
        >
          <Layers size={14} color="var(--text-muted)" />
          <strong style={{ fontSize: 13 }}>Denah & Status Meja</strong>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            <button
              className={`chip${filter === "all" ? " chip--active" : ""}`}
              onClick={() => setFilter("all")}
            >
              Semua ({stats.all})
            </button>
            {STATUS_ORDER.map((status) => (
              <button
                key={status}
                className={`chip${filter === status ? " chip--active" : ""}`}
                onClick={() => setFilter(status)}
              >
                {STATUS_META[status].label} ({stats[status] ?? 0})
              </button>
            ))}
            <button
              className="btn btn-primary btn-sm"
              onClick={() => openTableForm(null)}
              style={{ marginLeft: 6 }}
            >
              <Plus size={13} /> Tambah Meja
            </button>
          </div>
        </div>

        {showTableForm && (
          <form onSubmit={submitTable} className="management-form">
            <div className="form-group">
              <label className="form-label">Nomor Meja *</label>
              <input
                className="form-input"
                value={tableForm.tableNumber}
                onChange={(e) =>
                  setTableForm((prev) => ({
                    ...prev,
                    tableNumber: e.target.value,
                  }))
                }
                placeholder="Misal: A1, T-04"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Kapasitas</label>
              <input
                className="form-input"
                type="number"
                min="1"
                value={tableForm.capacity}
                onChange={(e) =>
                  setTableForm((prev) => ({
                    ...prev,
                    capacity: e.target.value,
                  }))
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">Area</label>
              <Select
                value={tableForm.areaId}
                onChange={(e) =>
                  setTableForm((prev) => ({ ...prev, areaId: e.target.value }))
                }
              >
                <option value="">Tanpa area</option>
                {areaList.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </Select>
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
                onClick={resetTableForm}
              >
                <X size={13} /> Batal
              </button>
              <button className="btn btn-primary btn-sm" disabled={saving}>
                <Save size={13} />
                {editingTable ? "Simpan Perubahan" : "Simpan Meja"}
              </button>
            </div>
          </form>
        )}

        <div className="dashboard-card-body">
          {tables.loading ? (
            <div className="loading-center">
              <div className="spinner" />
            </div>
          ) : filteredTables.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: "var(--text-muted)",
                padding: 24,
              }}
            >
              Belum ada meja
              {filter !== "all"
                ? ` dengan status ${STATUS_META[filter].label}`
                : ""}
              .
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 12,
              }}
            >
              {filteredTables.map((table) => {
                const meta = STATUS_META[table.status];
                const Icon = meta.icon;
                return (
                  <div
                    key={table.id}
                    style={{
                      border: `1px solid ${meta.color}`,
                      borderRadius: "var(--radius-md)",
                      background: meta.bg,
                      padding: 14,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <strong style={{ fontSize: 18, color: meta.color }}>
                        {table.table_number}
                      </strong>
                      <Icon size={16} color={meta.color} />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        color: "var(--text-secondary)",
                        fontSize: 12,
                      }}
                    >
                      <Users size={12} /> Kapasitas {table.capacity}
                    </div>
                    {table.area && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        {table.area.name}
                      </div>
                    )}
                    <Select
                      value={table.status}
                      onChange={(e) =>
                        changeStatus(
                          table,
                          e.target.value as DiningTable["status"],
                        )
                      }
                      disabled={saving}
                      style={{ padding: "5px 8px", fontSize: 12 }}
                    >
                      {STATUS_ORDER.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_META[status].label}
                        </option>
                      ))}
                    </Select>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => openTableForm(table)}
                    >
                      Edit
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Areas */}
      <div className="dashboard-card">
        <div
          className="dashboard-card-header"
          style={{ gap: 8, flexWrap: "wrap" }}
        >
          <Layers size={14} color="var(--text-muted)" />
          <strong style={{ fontSize: 13 }}>Area Dine-In</strong>
          <button
            className="btn btn-primary btn-sm"
            style={{ marginLeft: "auto" }}
            onClick={() => openAreaForm(null)}
          >
            <Plus size={13} /> Tambah Area
          </button>
        </div>

        {showAreaForm && (
          <form onSubmit={submitArea} className="management-form">
            <div className="form-group" style={{ gridColumn: "span 2" }}>
              <label className="form-label">Nama Area *</label>
              <input
                className="form-input"
                value={areaName}
                onChange={(e) => setAreaName(e.target.value)}
                placeholder="Misal: Indoor, Lantai 2"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Deskripsi</label>
              <input
                className="form-input"
                value={areaDesc}
                onChange={(e) => setAreaDesc(e.target.value)}
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
                onClick={resetAreaForm}
              >
                <X size={13} /> Batal
              </button>
              <button className="btn btn-primary btn-sm" disabled={saving}>
                <Save size={13} />
                {editingArea ? "Simpan" : "Tambah"}
              </button>
            </div>
          </form>
        )}

        <div className="dashboard-card-body" style={{ padding: 0 }}>
          {areas.loading ? (
            <div className="loading-center">
              <div className="spinner" />
            </div>
          ) : (
            <table className="pos-data-table">
              <thead>
                <tr>
                  <th>Nama Area</th>
                  <th>Deskripsi</th>
                  <th>Jumlah Meja</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {areaList.map((area) => (
                  <tr key={area.id}>
                    <td style={{ fontWeight: 600 }}>{area.name}</td>
                    <td style={{ color: "var(--text-muted)" }}>
                      {area.description || "—"}
                    </td>
                    <td>{area.tables?.length ?? 0}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => openAreaForm(area)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          disabled={saving}
                          onClick={() => deactivateArea(area)}
                        >
                          Nonaktifkan
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!areaList.length && (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        textAlign: "center",
                        color: "var(--text-muted)",
                        padding: 18,
                      }}
                    >
                      Belum ada area. Tambahkan area dine-in pertama untuk
                      mengelompokkan meja.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PosAppShell>
  );
}
