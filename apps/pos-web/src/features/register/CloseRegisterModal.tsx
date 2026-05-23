import { useState, useEffect, FormEvent } from "react";
import {
  Lock,
  X,
  DollarSign,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { useRegisterStore } from "../../store/register.store";
import { useAuthStore } from "../../store/auth.store";
import {
  closeRegister,
  getSessionSummary,
  SessionSummary,
} from "../../services/api";
import { useNavigate } from "react-router-dom";

interface Props {
  onClose: () => void;
}

function fmt(n: number | null | undefined): string {
  return new Intl.NumberFormat("id-ID").format(Math.round(Number(n ?? 0)));
}

function VarianceBadge({ variance }: { variance: number | null }) {
  if (variance === null) return null;
  const abs = Math.abs(variance);
  if (abs === 0) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          color: "var(--stock-ok)",
          fontWeight: 600,
        }}
      >
        <CheckCircle size={13} /> Rp0 (Pas)
      </span>
    );
  }
  const isOver = variance > 0;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        color: isOver ? "var(--stock-ok)" : "var(--danger, #ef4444)",
        fontWeight: 600,
      }}
    >
      {isOver ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
      {isOver ? "+" : "-"}Rp{fmt(abs)} ({isOver ? "Lebih" : "Kurang"})
    </span>
  );
}

export default function CloseRegisterModal({ onClose }: Props) {
  const [countedCash, setCountedCash] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  const session = useRegisterStore((s) => s.session);
  const refresh = useRegisterStore((s) => s.refresh);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  // Derived variance from live counted cash input vs summary expected
  const expectedCash = summary?.expectedCash ?? null;
  const liveCountedCash = countedCash !== "" ? Number(countedCash) : null;
  const liveVariance =
    expectedCash !== null && liveCountedCash !== null
      ? liveCountedCash - expectedCash
      : null;

  async function loadSummary() {
    if (!session) return;
    setSummaryLoading(true);
    setSummaryError("");
    try {
      const data = await getSessionSummary(session.id);
      setSummary(data);
    } catch (err: unknown) {
      setSummaryError(
        err instanceof Error ? err.message : "Gagal memuat ringkasan sesi",
      );
    } finally {
      setSummaryLoading(false);
    }
  }

  useEffect(() => {
    void loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  async function handleClose(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    if (!countedCash) {
      setError("Masukkan jumlah uang yang dihitung");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await closeRegister({
        sessionId: session.id,
        countedCash: Number(countedCash),
        operatorId: user?.actor ?? "admin",
        notes,
      });
      await refresh();
      navigate("/kasir", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menutup sesi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 480, width: "100%" }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h3
            className="modal-title"
            style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}
          >
            <Lock size={18} /> Tutup Sesi #{session?.id}
          </h3>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            style={{ padding: "4px 8px" }}
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 12 }}>
            {error}
          </div>
        )}

        {/* ── Shift Summary Panel ─────────────────────────────── */}
        <div
          style={{
            background: "var(--surface-2, #f8fafc)",
            border: "1px solid var(--border, #e2e8f0)",
            borderRadius: 8,
            padding: "12px 14px",
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontWeight: 600,
                color: "var(--text-primary)",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <DollarSign size={13} /> Ringkasan Shift
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={loadSummary}
              disabled={summaryLoading}
              style={{ padding: "2px 6px", minHeight: 24 }}
              title="Refresh ringkasan"
            >
              <RefreshCw
                size={11}
                style={{
                  animation: summaryLoading
                    ? "spin 1s linear infinite"
                    : "none",
                }}
              />
            </button>
          </div>

          {summaryError && (
            <div
              style={{
                color: "var(--danger, #ef4444)",
                fontSize: 12,
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <AlertTriangle size={12} /> {summaryError}
            </div>
          )}

          {summaryLoading && !summary && (
            <div
              style={{
                color: "var(--text-muted)",
                fontSize: 12,
                textAlign: "center",
                padding: "8px 0",
              }}
            >
              Memuat ringkasan…
            </div>
          )}

          {summary && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {/* Opening cash */}
              <SummaryRow
                label="Modal Awal"
                value={`Rp${fmt(summary.openingCash)}`}
              />
              {/* Cash sales */}
              <SummaryRow
                label="Penjualan Tunai"
                value={`Rp${fmt(summary.cashSales)}`}
                positive
              />
              {/* Non-cash sales */}
              {summary.nonCashSales.map((nc) => (
                <SummaryRow
                  key={nc.method}
                  label={`Penjualan ${nc.method}`}
                  value={`Rp${fmt(nc.total)}`}
                  muted
                />
              ))}
              {/* Cash in */}
              {summary.cashIn > 0 && (
                <SummaryRow
                  label="Kas Masuk"
                  value={`+Rp${fmt(summary.cashIn)}`}
                  positive
                />
              )}
              {/* Cash out */}
              {summary.cashOut > 0 && (
                <SummaryRow
                  label="Kas Keluar / Pengeluaran"
                  value={`-Rp${fmt(summary.cashOut)}`}
                  negative
                />
              )}
              {/* Refunds */}
              <SummaryRow
                label="Refund"
                value={
                  summary.refunds > 0 ? `-Rp${fmt(summary.refunds)}` : "Rp0"
                }
                negative={summary.refunds > 0}
              />

              <div
                style={{
                  borderTop: "1px solid var(--border, #e2e8f0)",
                  marginTop: 4,
                  paddingTop: 8,
                }}
              />

              {/* Expected cash — key figure */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    fontSize: 13,
                  }}
                >
                  Kas Diharapkan (Sistem)
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    color: "var(--primary, #3b82f6)",
                    fontSize: 14,
                  }}
                >
                  Rp{fmt(summary.expectedCash)}
                </span>
              </div>

              {/* Transaction count */}
              <SummaryRow
                label="Jumlah Transaksi"
                value={String(summary.transactionCount)}
                muted
              />

              {/* Top sold products (up to 3) */}
              {summary.soldProducts.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginBottom: 4,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Produk Terjual
                  </div>
                  {summary.soldProducts.slice(0, 3).map((p) => (
                    <div
                      key={p.productId}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        padding: "2px 0",
                      }}
                    >
                      <span>{p.name}</span>
                      <span>
                        {p.qty}x — Rp{fmt(p.lineTotal)}
                      </span>
                    </div>
                  ))}
                  {summary.soldProducts.length > 3 && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginTop: 2,
                      }}
                    >
                      +{summary.soldProducts.length - 3} produk lainnya
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Close Form ──────────────────────────────────────── */}
        <form
          onSubmit={handleClose}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <div>
            <label
              className="form-label"
              style={{ display: "flex", alignItems: "center", gap: 5 }}
            >
              <DollarSign size={12} /> Uang Hasil Hitung (Rp) *
            </label>
            <input
              className="form-input"
              type="number"
              min="0"
              placeholder={
                expectedCash !== null ? String(Math.round(expectedCash)) : "0"
              }
              value={countedCash}
              onChange={(e) => setCountedCash(e.target.value)}
              required
              autoFocus
            />
            {/* Live variance preview */}
            {liveVariance !== null && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>Selisih:</span>
                <VarianceBadge variance={liveVariance} />
              </div>
            )}
          </div>

          <div>
            <label
              className="form-label"
              style={{ display: "flex", alignItems: "center", gap: 5 }}
            >
              <FileText size={12} /> Catatan Penutupan
            </label>
            <input
              className="form-input"
              placeholder="Shift selesai, dll."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ flex: 1 }}
              onClick={onClose}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-danger"
              style={{ flex: 1 }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 14, height: 14 }} />{" "}
                  Menutup…
                </>
              ) : (
                <>
                  <Lock size={14} /> Tutup Sesi
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Helper component ──────────────────────────────────────────────────────────

function SummaryRow({
  label,
  value,
  positive,
  negative,
  muted,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
  muted?: boolean;
}) {
  const color = positive
    ? "var(--stock-ok)"
    : negative
      ? "var(--danger, #ef4444)"
      : muted
        ? "var(--text-muted)"
        : "var(--text-secondary)";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 12,
      }}
    >
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span style={{ color, fontWeight: positive || negative ? 600 : 400 }}>
        {value}
      </span>
    </div>
  );
}
