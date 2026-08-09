import { useState } from "react";
import { LockOpen, Lock, RefreshCw, Plus, TrendingUp, TrendingDown } from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import { useApi } from "../hooks/useApi";
import { useRegisterStore } from "../store/register.store";
import {
  getSessionEntries,
  recordCashAdjustment,
  CashAdjustmentType,
} from "../services/api";
import CloseRegisterModal from "../features/register/CloseRegisterModal";
import RegisterGatePage from "../features/register/RegisterGatePage";
import { useUserMap } from "../hooks/useUserMap";
import { useToast } from "../store/toast.store";
import { fmt } from "../utils/fmt";
import { usePagination } from "../hooks/usePagination";
import Pagination from "../components/ui/Pagination";
import Select from "../components/ui/Select";

const ADJUSTMENT_OPTIONS: { value: CashAdjustmentType; label: string }[] = [
  { value: "cash_in", label: "Kas Masuk" },
  { value: "cash_out", label: "Kas Keluar" },
  { value: "expense", label: "Pengeluaran Operasional" },
];

export default function CashflowPage() {
  const [showClose, setShowClose] = useState(false);
  const [showOpen, setShowOpen] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [entryType, setEntryType] = useState<CashAdjustmentType>("cash_in");
  const [entryAmount, setEntryAmount] = useState("");
  const [entryNote, setEntryNote] = useState("");
  const [submittingEntry, setSubmittingEntry] = useState(false);
  const session = useRegisterStore((s) => s.session);
  const status = useRegisterStore((s) => s.status);
  const refresh = useRegisterStore((s) => s.refresh);
  const { resolveName } = useUserMap();
  const toast = useToast();

  const entries = useApi(
    () =>
      session
        ? getSessionEntries(session.id)
        : Promise.resolve({ entries: [] }),
    [session?.id],
  );

  async function handleCashEntry(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(entryAmount);
    if (!session || isNaN(amount) || amount <= 0) {
      toast.warning("Jumlah harus lebih dari 0");
      return;
    }
    setSubmittingEntry(true);
    try {
      await recordCashAdjustment(session.id, {
        adjustmentType: entryType,
        amount,
        note: entryNote.trim() || undefined,
      });
      setEntryAmount("");
      setEntryNote("");
      setShowEntryForm(false);
      await entries.reload();
      toast.success("Entri kas berhasil dicatat");
    } catch (err: any) {
      toast.error(err.message ?? "Gagal mencatat entri kas");
    } finally {
      setSubmittingEntry(false);
    }
  }

  const allEntries = (entries.data?.entries ?? []) as any[];
  const pagination = usePagination(allEntries, 20);

  const incomeTotal = allEntries
    .filter((e) => e.entry_type === "income")
    .reduce((s: number, e: any) => s + e.amount, 0);
  const expenseTotal = allEntries
    .filter((e) => e.entry_type !== "income")
    .reduce((s: number, e: any) => s + e.amount, 0);

  if (showOpen) {
    return (
      <RegisterGatePage
        onSuccess={() => {
          setShowOpen(false);
          refresh();
        }}
        onCancel={() => setShowOpen(false)}
      />
    );
  }

  return (
    <PosAppShell title="Manajemen Kas">
      {/* Register status */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: `2px solid ${status === "open" ? "var(--stock-ok)" : "var(--border)"}`,
          borderRadius: "var(--radius-md)",
          padding: 20,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              STATUS REGISTER
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background:
                    status === "open" ? "var(--stock-ok)" : "var(--text-muted)",
                  display: "inline-block",
                }}
              />
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color:
                    status === "open" ? "var(--stock-ok)" : "var(--text-muted)",
                }}
              >
                {status === "open" ? "SESI AKTIF" : "TIDAK ADA SESI"}
              </span>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={refresh}
            style={{ display: "flex", alignItems: "center", gap: 5 }}
          >
            <RefreshCw size={13} />
          </button>
        </div>

        {session && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
              marginBottom: 16,
            }}
          >
            {[
              ["Kasir", resolveName(session.cashier_id)],
              [
                "Dibuka",
                new Date(session.opened_at).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              ],
              ["Modal Awal", `Rp${fmt(session.opening_cash)}`],
            ].map(([l, v]) => (
              <div
                key={l}
                style={{
                  background: "var(--bg-elevated)",
                  borderRadius: 6,
                  padding: "10px 14px",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-muted)",
                    marginBottom: 3,
                  }}
                >
                  {l}
                </div>
                <div style={{ fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          {status === "none" && (
            <button
              className="btn btn-success"
              onClick={() => setShowOpen(true)}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <LockOpen size={15} /> Buka Register
            </button>
          )}
          {status === "open" && (
            <button
              className="btn btn-danger btn-sm"
              onClick={() => setShowClose(true)}
              style={{ display: "flex", alignItems: "center", gap: 5 }}
            >
              <Lock size={13} /> Tutup Register
            </button>
          )}
        </div>
      </div>

      {/* Balance summary */}
      {session && (
        <>
          <div
            className="summary-grid"
            style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 20 }}
          >
            <div className="summary-card">
              <div
                className="summary-card-label"
                style={{ color: "var(--stock-ok)" }}
              >
                Total Pemasukan
              </div>
              <div
                className="summary-card-value"
                style={{ color: "var(--stock-ok)" }}
              >
                Rp{fmt(incomeTotal)}
              </div>
            </div>
            <div className="summary-card">
              <div
                className="summary-card-label"
                style={{ color: "var(--stock-out)" }}
              >
                Total Pengeluaran
              </div>
              <div
                className="summary-card-value"
                style={{ color: "var(--stock-out)" }}
              >
                Rp{fmt(expenseTotal)}
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-card-label">Saldo Sesi</div>
              <div
                className="summary-card-value"
                style={{
                  color:
                    incomeTotal - expenseTotal >= 0
                      ? "var(--stock-ok)"
                      : "var(--stock-out)",
                }}
              >
                Rp{fmt(incomeTotal - expenseTotal)}
              </div>
            </div>
          </div>

          {/* Entries table */}
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                borderBottom: showEntryForm ? "none" : "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                Transaksi Sesi — {new Date(session.opened_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </span>
              {status === "open" && (
                <button
                  className={`btn btn-sm ${showEntryForm ? "btn-ghost" : "btn-primary"}`}
                  style={{ display: "flex", alignItems: "center", gap: 5 }}
                  onClick={() => setShowEntryForm((v) => !v)}
                >
                  <Plus size={13} />
                  {showEntryForm ? "Batal" : "Catat Kas"}
                </button>
              )}
            </div>

            {/* Manual cash entry form */}
            {showEntryForm && (
              <form
                onSubmit={handleCashEntry}
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--border)",
                  background: "var(--bg-elevated)",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 2fr auto",
                  gap: 8,
                  alignItems: "flex-end",
                }}
              >
                <div>
                  <label className="form-label" style={{ fontSize: 11 }}>Tipe</label>
                  <Select
                    value={entryType}
                    onChange={(e) => setEntryType(e.target.value as CashAdjustmentType)}
                  >
                    {ADJUSTMENT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 11 }}>Jumlah (Rp)</label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    placeholder="0"
                    value={entryAmount}
                    onChange={(e) => setEntryAmount(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 11 }}>Catatan</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Keterangan transaksi..."
                    value={entryNote}
                    onChange={(e) => setEntryNote(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={submittingEntry}
                  style={{ display: "flex", alignItems: "center", gap: 5 }}
                >
                  {submittingEntry ? (
                    <div className="spinner" style={{ width: 13, height: 13 }} />
                  ) : entryType === "cash_in" ? (
                    <TrendingUp size={13} />
                  ) : (
                    <TrendingDown size={13} />
                  )}
                  Simpan
                </button>
              </form>
            )}
            {entries.loading ? (
              <div className="loading-center">
                <div className="spinner" />
              </div>
            ) : (
              <table className="pos-data-table">
                <thead>
                  <tr>
                    {["Waktu", "Tipe", "Jumlah", "Metode", "Catatan", "Operator"].map(
                      (h) => <th key={h}>{h}</th>,
                    )}
                  </tr>
                </thead>
                <tbody>
                  {pagination.slice.map((e: any) => (
                    <tr key={e.id}>
                      <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {new Date(e.created_at).toLocaleString("id-ID")}
                      </td>
                      <td>
                        <span
                          className={`stock-badge ${
                            e.entry_type === "income"
                              ? "stock-badge--ok"
                              : "stock-badge--out"
                          }`}
                        >
                          {e.entry_type === "income" ? "Masuk" : "Keluar"}
                        </span>
                      </td>
                      <td
                        style={{
                          fontWeight: 600,
                          color:
                            e.entry_type === "income"
                              ? "var(--success)"
                              : "var(--danger)",
                        }}
                      >
                        {e.entry_type === "income" ? "+" : "-"}Rp{fmt(e.amount)}
                      </td>
                      <td style={{ color: "var(--text-muted)" }}>{e.payment_method}</td>
                      <td style={{ color: "var(--text-muted)" }}>{e.note}</td>
                      <td style={{ color: "var(--text-muted)" }}>{resolveName(e.operator_id)}</td>
                    </tr>
                  ))}
                  {!allEntries.length && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}
                      >
                        Belum ada transaksi
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
            <Pagination {...pagination} />
          </div>
        </>
      )}

      {showClose && (
        <CloseRegisterModal
          onClose={() => {
            setShowClose(false);
            refresh();
          }}
        />
      )}
    </PosAppShell>
  );
}
