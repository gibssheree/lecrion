// apps/pos-web/src/pages/StockOpnamePage.tsx
//
// Phase 12 — Stock opname (physical stock count) sessions.
// Lifecycle: draft → submitted → posted (or cancelled).

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Clock,
  ClipboardCheck,
  ClipboardList,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Save,
  Send,
  Sigma,
  X,
} from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import { useApi } from "../hooks/useApi";
import {
  StockOpnameLine,
  StockOpnameSession,
  StockOpnameStatus,
  cancelStockOpname,
  createStockOpnameSession,
  getStockOpnameSession,
  getStockOpnameSessions,
  postStockOpname,
  submitStockOpname,
  updateStockOpnameLine,
} from "../services/api";
import { useToast } from "../store/toast.store";
import { fmt, fmtDateTime } from "../utils/fmt";

const STATUS_META: Record<
  StockOpnameStatus,
  { label: string; color: string; bg: string }
> = {
  draft: {
    label: "Draft",
    color: "var(--text-secondary)",
    bg: "var(--bg-elevated)",
  },
  submitted: {
    label: "Diajukan",
    color: "var(--stock-low)",
    bg: "var(--stock-low-bg)",
  },
  posted: {
    label: "Selesai",
    color: "var(--stock-ok)",
    bg: "var(--stock-ok-bg)",
  },
  cancelled: {
    label: "Dibatalkan",
    color: "var(--stock-out)",
    bg: "var(--stock-out-bg)",
  },
};

export default function StockOpnamePage() {
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState<"all" | StockOpnameStatus>(
    "all",
  );
  const sessions = useApi(
    () =>
      getStockOpnameSessions(
        "default-store",
        statusFilter === "all" ? undefined : statusFilter,
      ),
    [statusFilter],
    { autoRefreshMs: 30_000 },
  );

  const [showCreate, setShowCreate] = useState(false);
  const [createNotes, setCreateNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);

  const list = sessions.data ?? [];

  const stats = useMemo(() => {
    const draft = list.filter((s) => s.status === "draft").length;
    const submitted = list.filter((s) => s.status === "submitted").length;
    const posted = list.filter((s) => s.status === "posted").length;
    return { draft, submitted, posted, total: list.length };
  }, [list]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const session = await createStockOpnameSession({
        notes: createNotes.trim() || undefined,
      });
      toast.success(`Sesi ${session.sessionNumber} dibuat`);
      setCreateNotes("");
      setShowCreate(false);
      setActiveId(session.id);
      sessions.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat sesi");
    } finally {
      setSaving(false);
    }
  }

  if (activeId) {
    return (
      <SessionDetail
        sessionId={activeId}
        onBack={() => {
          setActiveId(null);
          sessions.reload();
        }}
      />
    );
  }

  return (
    <PosAppShell title="Stock Opname">
      <div
        className="summary-grid"
        style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}
      >
        <div className="summary-card">
          <div className="summary-card-label">
            <ClipboardList size={13} /> Total Sesi
          </div>
          <div className="summary-card-value">{stats.total}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <Clock size={13} color="var(--text-secondary)" /> Draft
          </div>
          <div
            className="summary-card-value"
            style={{ color: "var(--text-secondary)" }}
          >
            {stats.draft}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <Send size={13} color="var(--stock-low)" /> Diajukan
          </div>
          <div
            className="summary-card-value"
            style={{ color: "var(--stock-low)" }}
          >
            {stats.submitted}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <CheckCircle2 size={13} color="var(--stock-ok)" /> Selesai
          </div>
          <div
            className="summary-card-value"
            style={{ color: "var(--stock-ok)" }}
          >
            {stats.posted}
          </div>
        </div>
      </div>

      <div className="dashboard-card" style={{ marginBottom: 16 }}>
        <div
          className="dashboard-card-header"
          style={{ gap: 8, flexWrap: "wrap" }}
        >
          <ClipboardList size={14} color="var(--text-muted)" />
          <strong style={{ fontSize: 13 }}>Riwayat Sesi Opname</strong>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <button
              className={`chip${statusFilter === "all" ? " chip--active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              Semua
            </button>
            {(["draft", "submitted", "posted", "cancelled"] as const).map(
              (s) => (
                <button
                  key={s}
                  className={`chip${statusFilter === s ? " chip--active" : ""}`}
                  onClick={() => setStatusFilter(s)}
                >
                  {STATUS_META[s].label}
                </button>
              ),
            )}
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => sessions.reload()}
              title="Muat ulang"
            >
              <RefreshCw size={13} />
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowCreate(true)}
            >
              <Plus size={13} /> Sesi Baru
            </button>
          </div>
        </div>

        {showCreate && (
          <form onSubmit={handleCreate} className="management-form">
            <div className="form-group" style={{ gridColumn: "span 3" }}>
              <label className="form-label">Catatan Sesi</label>
              <input
                className="form-input"
                value={createNotes}
                onChange={(e) => setCreateNotes(e.target.value)}
                placeholder="Misal: Opname akhir bulan November"
                autoFocus
              />
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginTop: 4,
                }}
              >
                Sesi akan otomatis berisi semua produk yang stoknya dilacak.
              </div>
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
                <Save size={13} /> Buat Sesi
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setShowCreate(false);
                  setCreateNotes("");
                }}
              >
                <X size={13} /> Batal
              </button>
            </div>
          </form>
        )}

        <div className="dashboard-card-body" style={{ padding: 0 }}>
          {sessions.loading && list.length === 0 ? (
            <div
              style={{
                padding: 24,
                color: "var(--text-muted)",
                textAlign: "center",
              }}
            >
              Memuat…
            </div>
          ) : list.length === 0 ? (
            <div
              style={{
                padding: 28,
                color: "var(--text-muted)",
                textAlign: "center",
              }}
            >
              Belum ada sesi opname.
            </div>
          ) : (
            <table className="data-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>No. Sesi</th>
                  <th>Status</th>
                  <th>Dibuat</th>
                  <th>Oleh</th>
                  <th style={{ textAlign: "right" }}>Total Variance</th>
                  <th style={{ textAlign: "right" }}>Nilai Variance</th>
                  <th style={{ textAlign: "right", width: 90 }} />
                </tr>
              </thead>
              <tbody>
                {list.map((session) => {
                  const meta = STATUS_META[session.status];
                  return (
                    <tr key={session.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {session.sessionNumber}
                        </div>
                        {session.notes && (
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--text-muted)",
                            }}
                          >
                            {session.notes}
                          </div>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            padding: "2px 8px",
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 700,
                            color: meta.color,
                            background: meta.bg,
                          }}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td>{fmtDateTime(session.createdAt)}</td>
                      <td>{session.createdBy}</td>
                      <td style={{ textAlign: "right" }}>
                        {session.totalVarianceQty}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          color:
                            session.totalVarianceValue >= 0
                              ? "var(--stock-ok)"
                              : "var(--stock-out)",
                        }}
                      >
                        Rp{fmt(session.totalVarianceValue)}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setActiveId(session.id)}
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PosAppShell>
  );
}

// ── Session detail (count + submit + post) ─────────────────────────────────

interface DetailProps {
  sessionId: number;
  onBack: () => void;
}

function SessionDetail({ sessionId, onBack }: DetailProps) {
  const toast = useToast();
  const [data, setData] = useState<
    (StockOpnameSession & { lines: StockOpnameLine[] }) | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [draftCounts, setDraftCounts] = useState<
    Record<number, { qty: string; notes: string }>
  >({});

  async function load() {
    setLoading(true);
    try {
      const res = await getStockOpnameSession(sessionId);
      setData(res);
      const drafts: Record<number, { qty: string; notes: string }> = {};
      for (const line of res.lines ?? []) {
        drafts[line.id] = {
          qty: line.countedQty != null ? String(line.countedQty) : "",
          notes: line.notes ?? "",
        };
      }
      setDraftCounts(drafts);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat sesi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const filteredLines = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.lines;
    return data.lines.filter((l) => l.productName.toLowerCase().includes(q));
  }, [data, search]);

  const totals = useMemo(() => {
    if (!data) return { counted: 0, total: 0, variance: 0, value: 0 };
    let counted = 0;
    let variance = 0;
    let value = 0;
    for (const line of data.lines) {
      if (line.countedQty != null) counted += 1;
      variance += Math.abs(line.varianceQty);
      value += line.varianceValue;
    }
    return { counted, total: data.lines.length, variance, value };
  }, [data]);

  if (loading || !data) {
    return (
      <PosAppShell title="Stock Opname">
        <div
          style={{
            padding: 32,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            color: "var(--text-muted)",
          }}
        >
          <Loader2 size={16} className="spin" /> Memuat sesi…
        </div>
      </PosAppShell>
    );
  }

  const isDraft = data.status === "draft";
  const isSubmitted = data.status === "submitted";
  const isPosted = data.status === "posted";
  const isCancelled = data.status === "cancelled";

  async function saveLine(line: StockOpnameLine) {
    if (!data || !isDraft) return;
    const draft = draftCounts[line.id];
    if (!draft) return;
    const qty = Number(draft.qty);
    if (draft.qty === "" || !Number.isFinite(qty) || qty < 0) {
      toast.warning("Counted qty harus angka >= 0");
      return;
    }
    setSaving(true);
    try {
      await updateStockOpnameLine(data.id, line.id, {
        countedQty: qty,
        notes: draft.notes.trim() || undefined,
      });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!data) return;
    if (totals.counted < totals.total) {
      toast.warning(
        `Masih ada ${totals.total - totals.counted} baris belum di-count`,
      );
      return;
    }
    if (
      !confirm(
        "Ajukan sesi ini ke manager untuk di-post? Setelah diajukan, baris tidak bisa diedit.",
      )
    )
      return;
    setSaving(true);
    try {
      await submitStockOpname(data.id);
      toast.success("Sesi diajukan");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengajukan");
    } finally {
      setSaving(false);
    }
  }

  async function handlePost() {
    if (!data) return;
    if (
      !confirm(
        "Posting sesi ini akan mengubah stok produk sesuai variance. Lanjutkan?",
      )
    )
      return;
    setSaving(true);
    try {
      await postStockOpname(data.id);
      toast.success("Sesi di-post, stok diperbarui");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal posting");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    if (!data) return;
    const reason = prompt("Alasan pembatalan?");
    if (reason === null) return;
    setSaving(true);
    try {
      await cancelStockOpname(data.id, reason || undefined);
      toast.success("Sesi dibatalkan");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membatalkan");
    } finally {
      setSaving(false);
    }
  }

  const meta = STATUS_META[data.status];

  return (
    <PosAppShell title={`Stock Opname · ${data.sessionNumber}`}>
      <div style={{ marginBottom: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          <ArrowLeft size={13} /> Kembali ke Daftar
        </button>
      </div>

      <div
        className="summary-grid"
        style={{ gridTemplateColumns: "repeat(5, 1fr)", marginBottom: 16 }}
      >
        <div className="summary-card">
          <div className="summary-card-label">
            <ClipboardCheck size={13} /> Status
          </div>
          <div
            className="summary-card-value"
            style={{ color: meta.color, fontSize: 18 }}
          >
            {meta.label}
          </div>
          <div className="summary-card-sub">
            Dibuat {fmtDateTime(data.createdAt)}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <Package size={13} /> Baris
          </div>
          <div className="summary-card-value">
            {totals.counted}/{totals.total}
          </div>
          <div className="summary-card-sub">sudah dihitung</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <Sigma size={13} color="var(--stock-low)" /> Total |Variance|
          </div>
          <div
            className="summary-card-value"
            style={{ color: "var(--stock-low)" }}
          >
            {totals.variance}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <AlertCircle size={13} color="var(--stock-out)" /> Nilai Variance
          </div>
          <div
            className="summary-card-value"
            style={{
              color: totals.value >= 0 ? "var(--stock-ok)" : "var(--stock-out)",
            }}
          >
            Rp{fmt(totals.value)}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <ClipboardList size={13} /> Aksi
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {isDraft && (
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSubmit}
                disabled={saving}
              >
                <Send size={12} /> Ajukan
              </button>
            )}
            {isSubmitted && (
              <button
                className="btn btn-success btn-sm"
                onClick={handlePost}
                disabled={saving}
              >
                <CheckCircle2 size={12} /> Posting Stok
              </button>
            )}
            {(isDraft || isSubmitted) && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleCancel}
                disabled={saving}
                style={{ color: "var(--stock-out)" }}
              >
                <Ban size={12} /> Batalkan
              </button>
            )}
            {(isPosted || isCancelled) && (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  textAlign: "center",
                }}
              >
                Sesi terkunci
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-card">
        <div
          className="dashboard-card-header"
          style={{ gap: 8, flexWrap: "wrap" }}
        >
          <Package size={14} color="var(--text-muted)" />
          <strong style={{ fontSize: 13 }}>Baris Opname</strong>
          <input
            className="form-input form-input-sm"
            placeholder="Cari produk…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 240, marginLeft: 12 }}
          />
        </div>
        <div className="dashboard-card-body" style={{ padding: 0 }}>
          <table className="data-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Produk</th>
                <th style={{ textAlign: "right", width: 90 }}>Sistem</th>
                <th style={{ textAlign: "right", width: 130 }}>Hitung Fisik</th>
                <th style={{ textAlign: "right", width: 90 }}>Variance</th>
                <th style={{ textAlign: "right", width: 110 }}>Nilai</th>
                <th style={{ width: 200 }}>Catatan</th>
                {isDraft && <th style={{ width: 70 }} />}
              </tr>
            </thead>
            <tbody>
              {filteredLines.map((line) => {
                const draft = draftCounts[line.id] ?? { qty: "", notes: "" };
                const liveQty = isDraft
                  ? Number(draft.qty)
                  : (line.countedQty ?? 0);
                const liveVariance =
                  isDraft && draft.qty !== ""
                    ? liveQty - line.systemQty
                    : line.varianceQty;
                const liveValue =
                  isDraft && draft.qty !== ""
                    ? liveVariance * (line.unitCost ?? 0)
                    : line.varianceValue;
                const varianceColor =
                  liveVariance === 0
                    ? "var(--text-muted)"
                    : liveVariance > 0
                      ? "var(--stock-ok)"
                      : "var(--stock-out)";
                return (
                  <tr key={line.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{line.productName}</div>
                      {line.unitCost != null && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text-muted)",
                          }}
                        >
                          @Rp{fmt(line.unitCost)} per unit
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>{line.systemQty}</td>
                    <td style={{ textAlign: "right" }}>
                      {isDraft ? (
                        <input
                          className="form-input form-input-sm"
                          type="number"
                          min="0"
                          value={draft.qty}
                          onChange={(e) =>
                            setDraftCounts((prev) => ({
                              ...prev,
                              [line.id]: {
                                ...(prev[line.id] ?? { qty: "", notes: "" }),
                                qty: e.target.value,
                              },
                            }))
                          }
                          style={{ textAlign: "right" }}
                        />
                      ) : (
                        (line.countedQty ?? "—")
                      )}
                    </td>
                    <td style={{ textAlign: "right", color: varianceColor }}>
                      {liveVariance > 0 ? "+" : ""}
                      {liveVariance}
                    </td>
                    <td style={{ textAlign: "right", color: varianceColor }}>
                      Rp{fmt(liveValue)}
                    </td>
                    <td>
                      {isDraft ? (
                        <input
                          className="form-input form-input-sm"
                          value={draft.notes}
                          onChange={(e) =>
                            setDraftCounts((prev) => ({
                              ...prev,
                              [line.id]: {
                                ...(prev[line.id] ?? { qty: "", notes: "" }),
                                notes: e.target.value,
                              },
                            }))
                          }
                          placeholder="Catatan baris…"
                        />
                      ) : (
                        (line.notes ?? "—")
                      )}
                    </td>
                    {isDraft && (
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => saveLine(line)}
                          disabled={saving}
                          title="Simpan baris"
                        >
                          <Save size={12} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </PosAppShell>
  );
}
