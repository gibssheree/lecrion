import { FormEvent, useMemo, useState } from "react";
import { ArrowRightLeft, Plus, Save, X } from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import {
  OperationDocument,
  cancelOperationDocument,
  createOperationDocument,
  getInventoryLocations,
  getOperationDocuments,
  getProducts,
  postOperationDocument,
  submitOperationDocument,
} from "../services/api";
import { useApi } from "../hooks/useApi";
import { fmtDateTime } from "../utils/fmt";
import { useToast } from "../store/toast.store";

interface TransferLine {
  menuId: string;
  qty: string;
}

interface TransferForm {
  sourceLocationId: string;
  destinationLocationId: string;
  notes: string;
  lines: TransferLine[];
}

const emptyLine: TransferLine = { menuId: "", qty: "1" };
const emptyForm: TransferForm = {
  sourceLocationId: "",
  destinationLocationId: "",
  notes: "",
  lines: [{ ...emptyLine }],
};

const STATUS_META: Record<
  string,
  { label: string; bg: string; color: string }
> = {
  draft: {
    label: "Draft",
    bg: "var(--bg-elevated)",
    color: "var(--text-secondary)",
  },
  submitted: {
    label: "Submitted",
    bg: "var(--stock-low-bg)",
    color: "var(--stock-low)",
  },
  posted: {
    label: "Posted",
    bg: "var(--stock-ok-bg)",
    color: "var(--stock-ok)",
  },
  cancelled: {
    label: "Cancelled",
    bg: "var(--stock-out-bg)",
    color: "var(--stock-out)",
  },
};

export default function StockTransfersPage() {
  const toast = useToast();
  const docs = useApi(
    () =>
      getOperationDocuments({
        documentType: "stock_transfer",
        limit: 100,
      }),
    [],
    { autoRefreshMs: 30_000 },
  );
  const products = useApi(getProducts, []);
  const locations = useApi(getInventoryLocations, []);

  const [form, setForm] = useState<TransferForm>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const docList = (docs.data?.documents ??
    docs.data?.items ??
    []) as OperationDocument[];
  const filteredDocs = useMemo(
    () =>
      statusFilter ? docList.filter((d) => d.status === statusFilter) : docList,
    [docList, statusFilter],
  );

  const stats = useMemo(() => {
    return {
      total: docList.length,
      draft: docList.filter((d) => d.status === "draft").length,
      submitted: docList.filter((d) => d.status === "submitted").length,
      posted: docList.filter((d) => d.status === "posted").length,
    };
  }, [docList]);

  function resetForm() {
    setForm(emptyForm);
    setShowForm(false);
  }

  function addLine() {
    setForm((prev) => ({ ...prev, lines: [...prev.lines, { ...emptyLine }] }));
  }

  function removeLine(index: number) {
    setForm((prev) => ({
      ...prev,
      lines:
        prev.lines.length === 1
          ? [{ ...emptyLine }]
          : prev.lines.filter((_, i) => i !== index),
    }));
  }

  function updateLine(index: number, patch: Partial<TransferLine>) {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line, i) =>
        i === index ? { ...line, ...patch } : line,
      ),
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.sourceLocationId || !form.destinationLocationId) {
      toast.warning("Lokasi asal dan tujuan wajib dipilih");
      return;
    }
    if (form.sourceLocationId === form.destinationLocationId) {
      toast.warning("Lokasi asal dan tujuan tidak boleh sama");
      return;
    }
    const validLines = form.lines.filter(
      (line) => line.menuId && Number(line.qty) > 0,
    );
    if (!validLines.length) {
      toast.warning("Tambahkan minimal 1 produk dengan qty > 0");
      return;
    }
    setSaving(true);
    try {
      await createOperationDocument({
        documentType: "stock_transfer",
        sourceLocationId: Number(form.sourceLocationId),
        destinationLocationId: Number(form.destinationLocationId),
        notes: form.notes.trim() || undefined,
        lines: validLines.map((line) => ({
          menuId: Number(line.menuId),
          qty: Number(line.qty),
        })),
      });
      toast.success(
        "Transfer dibuat (draft). Submit lalu post untuk apply stok.",
      );
      resetForm();
      docs.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function transition(
    doc: OperationDocument,
    action: "submit" | "post" | "cancel",
  ) {
    setSaving(true);
    try {
      if (action === "submit") {
        await submitOperationDocument(doc.id);
        toast.success(`Transfer ${doc.documentNumber} di-submit`);
      } else if (action === "post") {
        await postOperationDocument(doc.id);
        toast.success(`Transfer ${doc.documentNumber} berhasil di-post`);
      } else if (action === "cancel") {
        const reason = prompt("Alasan pembatalan") ?? "";
        if (!reason.trim()) return;
        await cancelOperationDocument(doc.id, reason.trim());
        toast.success(`Transfer ${doc.documentNumber} dibatalkan`);
      }
      docs.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const productList = (products.data?.products ?? []) as Array<{
    id: number;
    name: string;
  }>;
  const locationList = locations.data ?? [];
  const locationName = (id: number | null | undefined) =>
    locationList.find((loc) => loc.id === id)?.name ?? "—";

  return (
    <PosAppShell title="Transfer Stok">
      <div
        className="summary-grid"
        style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}
      >
        <div className="summary-card">
          <div className="summary-card-label">
            <ArrowRightLeft size={13} /> Total Transfer
          </div>
          <div className="summary-card-value">{stats.total}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Draft</div>
          <div className="summary-card-value">{stats.draft}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Submitted</div>
          <div
            className="summary-card-value"
            style={{ color: "var(--stock-low)" }}
          >
            {stats.submitted}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Posted</div>
          <div
            className="summary-card-value"
            style={{ color: "var(--stock-ok)" }}
          >
            {stats.posted}
          </div>
        </div>
      </div>

      <div className="dashboard-card">
        <div
          className="dashboard-card-header"
          style={{ gap: 8, flexWrap: "wrap" }}
        >
          <ArrowRightLeft size={14} color="var(--text-muted)" />
          <strong style={{ fontSize: 13 }}>Daftar Transfer Stok</strong>
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 160, marginLeft: 12 }}
          >
            <option value="">Semua status</option>
            {Object.entries(STATUS_META).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowForm((value) => !value)}
            style={{ marginLeft: "auto" }}
          >
            <Plus size={13} /> Buat Transfer
          </button>
        </div>

        {showForm && (
          <form onSubmit={submit} className="management-form">
            <div className="form-group">
              <label className="form-label">Lokasi Asal *</label>
              <select
                className="form-select"
                value={form.sourceLocationId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    sourceLocationId: e.target.value,
                  }))
                }
              >
                <option value="">Pilih lokasi asal</option>
                {locationList.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Lokasi Tujuan *</label>
              <select
                className="form-select"
                value={form.destinationLocationId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    destinationLocationId: e.target.value,
                  }))
                }
              >
                <option value="">Pilih lokasi tujuan</option>
                {locationList.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Catatan</label>
              <input
                className="form-input"
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Opsional"
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <strong style={{ fontSize: 13 }}>Item Transfer</strong>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 120px 40px",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                {form.lines.map((line, index) => (
                  <div key={index} style={{ display: "contents" }}>
                    <select
                      className="form-select"
                      value={line.menuId}
                      onChange={(e) =>
                        updateLine(index, { menuId: e.target.value })
                      }
                    >
                      <option value="">Pilih produk</option>
                      {productList.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                    <input
                      className="form-input"
                      type="number"
                      min="1"
                      value={line.qty}
                      onChange={(e) =>
                        updateLine(index, { qty: e.target.value })
                      }
                    />
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => removeLine(index)}
                      title="Hapus baris"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={addLine}
                  style={{ gridColumn: "1 / -1", marginTop: 4 }}
                >
                  <Plus size={12} /> Tambah Item
                </button>
              </div>
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
                onClick={resetForm}
              >
                <X size={13} /> Batal
              </button>
              <button className="btn btn-primary btn-sm" disabled={saving}>
                <Save size={13} /> Simpan Draft
              </button>
            </div>
          </form>
        )}

        <div className="dashboard-card-body" style={{ padding: 0 }}>
          {docs.loading ? (
            <div className="loading-center">
              <div className="spinner" />
            </div>
          ) : (
            <table className="pos-data-table">
              <thead>
                <tr>
                  <th>Nomor</th>
                  <th>Status</th>
                  <th>Asal → Tujuan</th>
                  <th>Item</th>
                  <th>Dibuat</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc) => {
                  const meta = STATUS_META[doc.status] ?? STATUS_META.draft;
                  return (
                    <tr key={doc.id}>
                      <td style={{ fontWeight: 600 }}>{doc.documentNumber}</td>
                      <td>
                        <span
                          className="stock-badge"
                          style={{
                            background: meta.bg,
                            color: meta.color,
                          }}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: 12 }}>
                          <strong>{locationName(doc.sourceLocationId)}</strong>
                          <div style={{ color: "var(--text-muted)" }}>
                            → {locationName(doc.destinationLocationId)}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {doc.lines.length} item ·{" "}
                        {doc.lines
                          .reduce((sum, line) => sum + line.qty, 0)
                          .toLocaleString("id-ID")}{" "}
                        unit
                      </td>
                      <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {fmtDateTime(doc.createdAt)}
                      </td>
                      <td>
                        <div
                          style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
                        >
                          {doc.status === "draft" && (
                            <button
                              className="btn btn-ghost btn-sm"
                              disabled={saving}
                              onClick={() => transition(doc, "submit")}
                            >
                              Submit
                            </button>
                          )}
                          {doc.status === "submitted" && (
                            <button
                              className="btn btn-primary btn-sm"
                              disabled={saving}
                              onClick={() => transition(doc, "post")}
                            >
                              Post
                            </button>
                          )}
                          {(doc.status === "draft" ||
                            doc.status === "submitted") && (
                            <button
                              className="btn btn-danger btn-sm"
                              disabled={saving}
                              onClick={() => transition(doc, "cancel")}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filteredDocs.length && (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        textAlign: "center",
                        color: "var(--text-muted)",
                        padding: 24,
                      }}
                    >
                      Belum ada transfer stok pada filter ini.
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
