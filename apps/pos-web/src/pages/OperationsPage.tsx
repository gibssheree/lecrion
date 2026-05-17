import { FormEvent, useMemo, useState } from "react";
import { FileText, Plus, Save, X } from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import {
  OperationDocument,
  cancelOperationDocument,
  createOperationDocument,
  getInventoryLocations,
  getOperationDocuments,
  getProducts,
  getSuppliers,
  postOperationDocument,
  submitOperationDocument,
} from "../services/api";
import { useApi } from "../hooks/useApi";

type OperationForm = {
  documentType: string;
  sourceLocationId: string;
  destinationLocationId: string;
  supplierId: string;
  supplierName: string;
  notes: string;
  menuId: string;
  qty: string;
  unitCost: string;
};

const emptyForm: OperationForm = {
  documentType: "purchase_order",
  sourceLocationId: "",
  destinationLocationId: "",
  supplierId: "",
  supplierName: "",
  notes: "",
  menuId: "",
  qty: "1",
  unitCost: "",
};

const DOC_TYPES = [
  { value: "purchase_order", label: "Purchase Order" },
  { value: "goods_receipt", label: "Goods Receipt" },
  { value: "stock_transfer", label: "Stock Transfer" },
  { value: "stock_adjustment", label: "Stock Adjustment" },
];

function fmtDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID");
}

function labelForType(value: string): string {
  return DOC_TYPES.find((item) => item.value === value)?.label ?? value;
}

export default function OperationsPage() {
  const [documentType, setDocumentType] = useState("");
  const [status, setStatus] = useState("");
  const docs = useApi(
    () =>
      getOperationDocuments({
        documentType: documentType || undefined,
        status: status || undefined,
        limit: 50,
      }),
    [documentType, status],
  );
  const products = useApi(getProducts, []);
  const locations = useApi(getInventoryLocations, []);
  const suppliers = useApi(() => getSuppliers(false), []);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<OperationForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rows = (docs.data?.documents ?? docs.data?.items ?? []) as OperationDocument[];

  const stats = useMemo(
    () => ({
      total: rows.length,
      draft: rows.filter((item) => item.status === "draft").length,
      submitted: rows.filter((item) => item.status === "submitted").length,
      posted: rows.filter((item) => item.status === "posted").length,
    }),
    [rows],
  );

  async function saveDocument(event: FormEvent) {
    event.preventDefault();
    if (!form.menuId || Number(form.qty) <= 0) {
      setError("Produk dan qty wajib diisi.");
      return;
    }
    if (
      ["goods_receipt", "stock_adjustment"].includes(form.documentType) &&
      !form.destinationLocationId
    ) {
      setError("Goods receipt dan stock adjustment membutuhkan lokasi tujuan.");
      return;
    }
    if (
      form.documentType === "stock_transfer" &&
      (!form.sourceLocationId || !form.destinationLocationId)
    ) {
      setError("Stock transfer membutuhkan lokasi asal dan tujuan.");
      return;
    }

    const payload = {
      documentType: form.documentType,
      sourceLocationId: form.sourceLocationId ? Number(form.sourceLocationId) : undefined,
      destinationLocationId: form.destinationLocationId ? Number(form.destinationLocationId) : undefined,
      supplierId: form.supplierId || undefined,
      supplierName: form.supplierName.trim() || undefined,
      notes: form.notes.trim() || undefined,
      lines: [
        {
          menuId: Number(form.menuId),
          qty: Number(form.qty),
          unitCost: form.unitCost === "" ? undefined : Number(form.unitCost),
        },
      ],
    };

    setSaving(true);
    setError(null);
    try {
      await createOperationDocument(payload);
      setShowForm(false);
      setForm(emptyForm);
      docs.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function transition(doc: OperationDocument, action: "submit" | "post" | "cancel") {
    setSaving(true);
    setError(null);
    try {
      if (action === "submit") await submitOperationDocument(doc.id);
      if (action === "post") await postOperationDocument(doc.id);
      if (action === "cancel") {
        const reason = prompt("Alasan pembatalan") ?? "";
        if (!reason.trim()) return;
        await cancelOperationDocument(doc.id, reason.trim());
      }
      docs.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PosAppShell title="PO / GR / Transfer">
      <div className="summary-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}>
        <div className="summary-card">
          <div className="summary-card-label"><FileText size={13} /> Total Dokumen</div>
          <div className="summary-card-value">{stats.total}</div>
        </div>
        <div className="summary-card"><div className="summary-card-label">Draft</div><div className="summary-card-value">{stats.draft}</div></div>
        <div className="summary-card"><div className="summary-card-label">Submitted</div><div className="summary-card-value">{stats.submitted}</div></div>
        <div className="summary-card"><div className="summary-card-label">Posted</div><div className="summary-card-value">{stats.posted}</div></div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {error}
          <button className="btn btn-ghost btn-sm" onClick={() => setError(null)} style={{ marginLeft: "auto" }}>
            <X size={12} />
          </button>
        </div>
      )}

      <div className="dashboard-card">
        <div className="dashboard-card-header" style={{ gap: 8 }}>
          <select className="form-select" value={documentType} onChange={(event) => setDocumentType(event.target.value)} style={{ width: 190 }}>
            <option value="">Semua tipe</option>
            {DOC_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
          <select className="form-select" value={status} onChange={(event) => setStatus(event.target.value)} style={{ width: 150 }}>
            <option value="">Semua status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="posted">Posted</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm((value) => !value)} style={{ marginLeft: "auto" }}>
            <Plus size={13} /> Buat Dokumen
          </button>
        </div>

        {showForm && (
          <form onSubmit={saveDocument} className="management-form">
            <div className="form-group">
              <label className="form-label">Tipe</label>
              <select className="form-select" value={form.documentType} onChange={(event) => setForm((prev) => ({ ...prev, documentType: event.target.value }))}>
                {DOC_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Lokasi Asal</label>
              <select className="form-select" value={form.sourceLocationId} onChange={(event) => setForm((prev) => ({ ...prev, sourceLocationId: event.target.value }))}>
                <option value="">-</option>
                {(locations.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Lokasi Tujuan</label>
              <select className="form-select" value={form.destinationLocationId} onChange={(event) => setForm((prev) => ({ ...prev, destinationLocationId: event.target.value }))}>
                <option value="">-</option>
                {(locations.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Supplier</label>
              <select
                className="form-select"
                value={form.supplierId}
                onChange={(event) =>
                  setForm((prev) => {
                    const supplier = (suppliers.data ?? []).find((item) => String(item.id) === event.target.value);
                    return { ...prev, supplierId: event.target.value, supplierName: supplier?.name ?? "" };
                  })
                }
              >
                <option value="">Manual / kosong</option>
                {(suppliers.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            {!form.supplierId && (
              <div className="form-group">
                <label className="form-label">Nama Supplier</label>
                <input className="form-input" value={form.supplierName} onChange={(event) => setForm((prev) => ({ ...prev, supplierName: event.target.value }))} />
              </div>
            )}
            <div className="form-group" style={{ gridColumn: "span 2" }}>
              <label className="form-label">Produk</label>
              <select className="form-select" value={form.menuId} onChange={(event) => setForm((prev) => ({ ...prev, menuId: event.target.value }))}>
                <option value="">Pilih produk</option>
                {((products.data?.products ?? []) as Array<{ id: number; name: string }>).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Qty</label>
              <input className="form-input" type="number" min="1" value={form.qty} onChange={(event) => setForm((prev) => ({ ...prev, qty: event.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Unit Cost</label>
              <input className="form-input" type="number" min="0" value={form.unitCost} onChange={(event) => setForm((prev) => ({ ...prev, unitCost: event.target.value }))} />
            </div>
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Catatan</label>
              <textarea className="form-textarea" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, gridColumn: "1 / -1" }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>
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
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            <table className="pos-data-table">
              <thead>
                <tr>
                  <th>Nomor</th>
                  <th>Status</th>
                  <th>Supplier</th>
                  <th>Item</th>
                  <th>Dibuat</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <strong>{doc.documentNumber}</strong>
                      <div style={{ color: "var(--text-muted)", fontSize: 11 }}>{labelForType(doc.documentType)}</div>
                    </td>
                    <td><span className={`stock-badge ${doc.status === "posted" ? "stock-badge--ok" : doc.status === "cancelled" ? "stock-badge--out" : "stock-badge--low"}`}>{doc.status}</span></td>
                    <td>{doc.supplierName ?? "-"}</td>
                    <td>{doc.lines.map((line) => `${line.productName} x${line.qty}`).join(", ")}</td>
                    <td>{fmtDate(doc.createdAt)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {doc.status === "draft" && <button className="btn btn-ghost btn-sm" disabled={saving} onClick={() => transition(doc, "submit")}>Submit</button>}
                        {doc.status === "submitted" && <button className="btn btn-primary btn-sm" disabled={saving} onClick={() => transition(doc, "post")}>Post</button>}
                        {(doc.status === "draft" || doc.status === "submitted") && <button className="btn btn-danger btn-sm" disabled={saving} onClick={() => transition(doc, "cancel")}>Cancel</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)" }}>Belum ada dokumen</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PosAppShell>
  );
}
