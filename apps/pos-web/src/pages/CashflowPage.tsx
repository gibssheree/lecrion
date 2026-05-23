import { useState } from "react";
import { LockOpen, Lock, RefreshCw, DollarSign } from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import { useApi } from "../hooks/useApi";
import { useRegisterStore } from "../store/register.store";
import {
  getActiveSession,
  getSessionEntries,
  openSession,
  closeSession,
} from "../services/api";
import CloseRegisterModal from "../features/register/CloseRegisterModal";
import RegisterGatePage from "../features/register/RegisterGatePage";

function fmt(n: number): string {
  return new Intl.NumberFormat("id-ID").format(Math.round(Number(n ?? 0)));
}

export default function CashflowPage() {
  const [showClose, setShowClose] = useState(false);
  const [showOpen, setShowOpen] = useState(false);
  const session = useRegisterStore((s) => s.session);
  const status = useRegisterStore((s) => s.status);
  const refresh = useRegisterStore((s) => s.refresh);

  const entries = useApi(
    () =>
      session
        ? getSessionEntries(session.id)
        : Promise.resolve({ entries: [] }),
    [session?.id],
  );

  const incomeTotal = ((entries.data?.entries ?? []) as any[])
    .filter((e) => e.entry_type === "income")
    .reduce((s: number, e: any) => s + e.amount, 0);
  const expenseTotal = ((entries.data?.entries ?? []) as any[])
    .filter((e) => e.entry_type !== "income")
    .reduce((s: number, e: any) => s + e.amount, 0);

  if (showOpen) {
    return (
      <RegisterGatePage
        onSuccess={() => {
          setShowOpen(false);
          refresh();
        }}
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
              ["Kasir", session.cashier_id],
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
                borderBottom: "1px solid var(--border)",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              Transaksi Sesi #{session.id}
            </div>
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
                  {((entries.data?.entries ?? []) as any[]).map((e: any) => (
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
                          {e.entry_type}
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
                      <td style={{ color: "var(--text-muted)" }}>{e.operator_id}</td>
                    </tr>
                  ))}
                  {!((entries.data?.entries ?? []) as any[]).length && (
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
