// apps/pos-web/src/pages/InvoicesPage.tsx
//
// Sales Invoice management (Faktur Penjualan).
// Untuk B2B customer, kredit, atau dokumentasi resmi penjualan.

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";

const BASE = "";
function getToken() {
  const s = sessionStorage.getItem("pos_token");
  if (s) return s;
  try {
    const p = JSON.parse(localStorage.getItem("pos-auth") ?? "{}");
    return p?.state?.token ?? null;
  } catch {
    return null;
  }
}
async function api<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).message || `HTTP ${res.status}`);
  return data as T;
}

function fmt(n: number) {
  return new Intl.NumberFormat("id-ID").format(Math.round(Number(n ?? 0)));
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: JSX.Element }> = {
  draft: { label: "Draft", color: "var(--text-muted)", icon: <Clock size={12} /> },
  issued: { label: "Diterbitkan", color: "var(--primary)", icon: <FileText size={12} /> },
  paid: { label: "Lunas", color: "var(--success)", icon: <CheckCircle size={12} /> },
  overdue: { label: "Jatuh Tempo", color: "var(--danger)", icon: <AlertTriangle size={12} /> },
  cancelled: { label: "Dibatalkan", color: "var(--text-muted)", icon: <XCircle size={12} /> },
};

const PAYMENT_TERMS_LABELS: Record<string, string> = {
  cod: "COD (Bayar di Tempat)",
  net_7: "Net 7 Hari",
  net_14: "Net 14 Hari",
  net_30: "Net 30 Hari",
  net_60: "Net 60 Hari",
};

const EMPTY_LINE = { description: "", qty: 1, unitPrice: 0 };

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontWeight: 600,
        color: cfg.color,
        background: `${cfg.color}18`,
        padding: "2px 8px",
        borderRadius: 99,
        border: `1px solid ${cfg.color}40`,
      }}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Create form state
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerAddress: "",
    paymentTerms: "net_30",
    issueDate: new Date().toISOString().slice(0, 10),
    notes: "",
    discount: 0,
    tax: 0,
  });
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = filterStatus ? `?status=${filterStatus}` : "";
      const [inv, sum] = await Promise.all([
        api<any>(`/api/invoices${qs}`),
        api<any>(`/api/invoices/summary`),
      ]);
      setInvoices(inv.data ?? []);
      setSummary(sum);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await api("/api/invoices", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          lines: lines.filter((l) => l.description.trim()),
        }),
      });
      setShowCreate(false);
      setForm({
        customerName: "", customerPhone: "", customerEmail: "",
        customerAddress: "", paymentTerms: "net_30",
        issueDate: new Date().toISOString().slice(0, 10),
        notes: "", discount: 0, tax: 0,
      });
      setLines([{ ...EMPTY_LINE }]);
      load();
    } catch (e: any) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: number, status: string) {
    try {
      await api(`/api/invoices/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          paidDate: status === "paid" ? new Date().toISOString().slice(0, 10) : undefined,
        }),
      });
      load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  function addLine() {
    setLines((prev) => [...prev, { ...EMPTY_LINE }]);
  }
  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }
  function updateLine(i: number, field: string, val: any) {
    setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l));
  }

  const lineSubtotal = lines.reduce((s, l) => s + (Number(l.unitPrice) || 0) * (Number(l.qty) || 0), 0);
  const totalPreview = lineSubtotal - (Number(form.discount) || 0) + (Number(form.tax) || 0);

  return (
    <PosAppShell title="Invoices (Faktur Penjualan)">
      {/* Summary cards */}
      {summary && (
        <div className="summary-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", marginBottom: 16 }}>
          <div className="summary-card">
            <div className="summary-card-label">Total Invoice</div>
            <div className="summary-card-value">{summary.total}</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-label">Diterbitkan</div>
            <div className="summary-card-value" style={{ color: "var(--primary)" }}>{summary.issued}</div>
            <div className="summary-card-sub">Rp{fmt(summary.issuedAmount)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-label">Lunas</div>
            <div className="summary-card-value" style={{ color: "var(--success)" }}>{summary.paid}</div>
            <div className="summary-card-sub">Rp{fmt(summary.paidAmount)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-label">Jatuh Tempo</div>
            <div className="summary-card-value" style={{ color: "var(--danger)" }}>{summary.overdue}</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-label">Draft</div>
            <div className="summary-card-value" style={{ color: "var(--text-muted)" }}>{summary.draft}</div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {["", "draft", "issued", "paid", "overdue", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`chip ${filterStatus === s ? "chip--active" : ""}`}
            >
              {s === "" ? "Semua" : STATUS_CONFIG[s]?.label ?? s}
            </button>
          ))}
        </div>
        <button
          onClick={load}
          className="btn btn-ghost btn-sm"
          style={{ display: "flex", alignItems: "center", gap: 4 }}
        >
          <RefreshCw size={12} /> Refresh
        </button>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="btn btn-primary btn-sm"
          style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}
        >
          <Plus size={12} /> Buat Invoice
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 12 }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="dashboard-card" style={{ marginBottom: 16 }}>
          <div className="dashboard-card-header">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Plus size={14} /> Buat Invoice Baru
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>Tutup</button>
          </div>
          <div className="dashboard-card-body">
            <form onSubmit={handleCreate}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="form-label">Nama Pelanggan *</label>
                  <input
                    className="form-input"
                    required
                    value={form.customerName}
                    onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                    placeholder="PT. Maju Jaya / Budi"
                  />
                </div>
                <div>
                  <label className="form-label">No. Telepon</label>
                  <input
                    className="form-input"
                    value={form.customerPhone}
                    onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))}
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input
                    className="form-input"
                    type="email"
                    value={form.customerEmail}
                    onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))}
                    placeholder="finance@company.com"
                  />
                </div>
                <div>
                  <label className="form-label">Syarat Pembayaran</label>
                  <select
                    className="form-input"
                    value={form.paymentTerms}
                    onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))}
                  >
                    {Object.entries(PAYMENT_TERMS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Tanggal Faktur *</label>
                  <input
                    className="form-input"
                    type="date"
                    required
                    value={form.issueDate}
                    onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label">Alamat</label>
                  <input
                    className="form-input"
                    value={form.customerAddress}
                    onChange={(e) => setForm((f) => ({ ...f, customerAddress: e.target.value }))}
                    placeholder="Jl. Merdeka No. 1"
                  />
                </div>
              </div>

              {/* Line items */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <label className="form-label" style={{ margin: 0 }}>Item / Jasa *</label>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={addLine} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Plus size={11} /> Tambah Baris
                  </button>
                </div>
                <div style={{ border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 120px 40px", background: "var(--surface-2)", padding: "6px 10px", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>
                    <span>Deskripsi</span><span style={{ textAlign: "center" }}>Qty</span><span style={{ textAlign: "right" }}>Harga Satuan</span><span />
                  </div>
                  {lines.map((l, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 120px 40px", padding: "6px 10px", borderTop: "1px solid var(--border)", alignItems: "center", gap: 6 }}>
                      <input
                        className="form-input"
                        style={{ padding: "4px 8px", fontSize: 13 }}
                        value={l.description}
                        onChange={(e) => updateLine(i, "description", e.target.value)}
                        placeholder="Nama produk / jasa"
                      />
                      <input
                        className="form-input"
                        style={{ padding: "4px 8px", fontSize: 13, textAlign: "center" }}
                        type="number"
                        min={1}
                        value={l.qty}
                        onChange={(e) => updateLine(i, "qty", parseInt(e.target.value) || 1)}
                      />
                      <input
                        className="form-input"
                        style={{ padding: "4px 8px", fontSize: 13, textAlign: "right" }}
                        type="number"
                        min={0}
                        value={l.unitPrice}
                        onChange={(e) => updateLine(i, "unitPrice", parseFloat(e.target.value) || 0)}
                      />
                      <button type="button" className="btn btn-ghost btn-sm" style={{ padding: "4px", color: "var(--danger)" }} onClick={() => removeLine(i)} disabled={lines.length === 1}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="form-label">Catatan</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Catatan tambahan untuk pelanggan..."
                    style={{ resize: "vertical" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span>Subtotal</span>
                    <span>Rp{fmt(lineSubtotal)}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, gap: 8 }}>
                    <span>Diskon</span>
                    <input
                      className="form-input"
                      style={{ width: 120, padding: "3px 8px", textAlign: "right", fontSize: 13 }}
                      type="number"
                      min={0}
                      value={form.discount}
                      onChange={(e) => setForm((f) => ({ ...f, discount: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, gap: 8 }}>
                    <span>Pajak</span>
                    <input
                      className="form-input"
                      style={{ width: 120, padding: "3px 8px", textAlign: "right", fontSize: 13 }}
                      type="number"
                      min={0}
                      value={form.tax}
                      onChange={(e) => setForm((f) => ({ ...f, tax: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 15, borderTop: "1px solid var(--border)", paddingTop: 6 }}>
                    <span>Total</span>
                    <span style={{ color: "var(--primary)" }}>Rp{fmt(totalPreview)}</span>
                  </div>
                </div>
              </div>

              {saveError && (
                <div className="alert alert-error" style={{ marginBottom: 10 }}>
                  <AlertCircle size={13} /> {saveError}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Menyimpan..." : "Simpan Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice list */}
      {loading ? (
        <div className="loading-center"><div className="spinner" /><span>Memuat...</span></div>
      ) : invoices.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 40, fontSize: 13 }}>
          Belum ada invoice. Klik "Buat Invoice" untuk membuat yang pertama.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {invoices.map((inv: any) => (
            <div key={inv.id} className="dashboard-card" style={{ marginBottom: 0 }}>
              <div
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer" }}
                onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>{inv.invoiceNumber}</span>
                    <StatusBadge status={inv.status} />
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    {inv.customerName}
                    {inv.customerPhone && <span style={{ marginLeft: 8, color: "var(--text-muted)" }}>{inv.customerPhone}</span>}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--primary)" }}>Rp{fmt(inv.total)}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {PAYMENT_TERMS_LABELS[inv.paymentTerms] ?? inv.paymentTerms} · {inv.issueDate}
                  </div>
                </div>
                {expandedId === inv.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>

              {expandedId === inv.id && (
                <div style={{ padding: "0 16px 14px", borderTop: "1px solid var(--border)" }}>
                  {/* Line items */}
                  <div style={{ margin: "10px 0 8px", fontSize: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 100px 100px", padding: "4px 0", fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)", marginBottom: 4 }}>
                      <span>Item</span><span style={{ textAlign: "center" }}>Qty</span><span style={{ textAlign: "right" }}>Harga</span><span style={{ textAlign: "right" }}>Total</span>
                    </div>
                    {(inv.lines ?? []).map((l: any) => (
                      <div key={l.id} style={{ display: "grid", gridTemplateColumns: "1fr 60px 100px 100px", padding: "3px 0" }}>
                        <span>{l.description}</span>
                        <span style={{ textAlign: "center" }}>{l.qty}</span>
                        <span style={{ textAlign: "right" }}>Rp{fmt(l.unitPrice)}</span>
                        <span style={{ textAlign: "right", fontWeight: 600 }}>Rp{fmt(l.total)}</span>
                      </div>
                    ))}
                    <div style={{ borderTop: "1px solid var(--border)", marginTop: 6, paddingTop: 6, display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-end" }}>
                      {inv.discount > 0 && <span style={{ fontSize: 12, color: "var(--warning)" }}>Diskon: -Rp{fmt(inv.discount)}</span>}
                      {inv.tax > 0 && <span style={{ fontSize: 12 }}>Pajak: +Rp{fmt(inv.tax)}</span>}
                      <span style={{ fontWeight: 700, fontSize: 14 }}>Total: Rp{fmt(inv.total)}</span>
                    </div>
                  </div>

                  {inv.notes && (
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10, padding: "6px 8px", background: "var(--surface-2)", borderRadius: 4 }}>
                      {inv.notes}
                    </div>
                  )}

                  {/* Action buttons */}
                  {!["paid", "cancelled"].includes(inv.status) && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {inv.status === "draft" && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleStatusChange(inv.id, "issued")}
                        >
                          Terbitkan
                        </button>
                      )}
                      {inv.status === "issued" && (
                        <button
                          className="btn btn-sm"
                          style={{ background: "var(--success)", color: "#fff" }}
                          onClick={() => handleStatusChange(inv.id, "paid")}
                        >
                          Tandai Lunas
                        </button>
                      )}
                      {["draft", "issued"].includes(inv.status) && (
                        <button
                          className="btn btn-sm"
                          style={{ background: "var(--warning)", color: "#fff" }}
                          onClick={() => handleStatusChange(inv.id, "overdue")}
                        >
                          Tandai Jatuh Tempo
                        </button>
                      )}
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: "var(--danger)" }}
                        onClick={() => {
                          if (confirm("Batalkan invoice ini?")) handleStatusChange(inv.id, "cancelled");
                        }}
                      >
                        Batalkan
                      </button>
                    </div>
                  )}
                  {inv.paidDate && (
                    <div style={{ fontSize: 11, color: "var(--success)", marginTop: 6 }}>
                      Lunas pada: {inv.paidDate}
                    </div>
                  )}
                  {inv.dueDate && inv.status !== "paid" && (
                    <div style={{ fontSize: 11, color: inv.status === "overdue" ? "var(--danger)" : "var(--text-muted)", marginTop: 4 }}>
                      Jatuh tempo: {inv.dueDate}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PosAppShell>
  );
}
