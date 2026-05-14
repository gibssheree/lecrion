import { useState } from "react";
import { useApi } from "../hooks/useApi";
import {
  getActiveSession,
  openSession,
  closeSession,
  getSessionEntries,
} from "../services/api";
import {
  LockOpen,
  Lock,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  FileText,
} from "lucide-react";

function fmt(n: number | null | undefined): string {
  return new Intl.NumberFormat("id-ID").format(Math.round(Number(n ?? 0)));
}

interface FormData {
  cashierId: string;
  openingCash: number | string;
  notes: string;
  countedCash: number | string;
}

export default function Cashflow() {
  const session = useApi(getActiveSession, [], { autoRefreshMs: 30_000 });
  const [openForm, setOpenForm] = useState(false);
  const [closeForm, setCloseForm] = useState(false);
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    cashierId: "",
    openingCash: 0,
    notes: "",
    countedCash: 0,
  });

  const active = (session.data as any)?.session;
  const entries = useApi(
    () =>
      active ? getSessionEntries(active.id) : Promise.resolve({ entries: [] }),
    [active?.id],
  );

  const incomeTotal = ((entries.data?.entries ?? []) as any[])
    .filter((e) => e.entry_type === "income")
    .reduce((s: number, e: any) => s + e.amount, 0);
  const expenseTotal = ((entries.data?.entries ?? []) as any[])
    .filter((e) => e.entry_type !== "income")
    .reduce((s: number, e: any) => s + e.amount, 0);
  const balance = incomeTotal - expenseTotal;

  async function handleOpen(e: React.FormEvent) {
    e.preventDefault();
    setOpening(true);
    try {
      await openSession({
        cashierId: formData.cashierId,
        openingCash: Number(formData.openingCash),
        notes: formData.notes,
      });
      setOpenForm(false);
      session.reload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setOpening(false);
    }
  }

  async function handleClose(e: React.FormEvent) {
    e.preventDefault();
    setClosing(true);
    try {
      await closeSession(active.id, {
        countedCash: Number(formData.countedCash),
        operatorId: formData.cashierId || "admin",
        notes: formData.notes,
      });
      setCloseForm(false);
      session.reload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setClosing(false);
    }
  }

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  return (
    <>
      <div
        className={`alert ${active ? "success" : "warning"}`}
        style={{ display: "flex", alignItems: "center", gap: 8 }}
      >
        {active ? (
          <>
            <CheckCircle size={14} /> Sesi kasir AKTIF — Dibuka oleh{" "}
            {active.cashier_id} sejak{" "}
            {new Date(active.opened_at).toLocaleString("id-ID")}
          </>
        ) : (
          <>
            <AlertTriangle size={14} /> Tidak ada sesi kasir yang sedang
            berjalan
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        {!active && (
          <button
            className="btn btn-primary"
            onClick={() => setOpenForm(!openForm)}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <LockOpen size={14} /> Buka Sesi Kasir
          </button>
        )}
        {active && (
          <button
            className="btn btn-danger"
            onClick={() => setCloseForm(!closeForm)}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <Lock size={14} /> Tutup Sesi Kasir
          </button>
        )}
        <button
          className="btn btn-ghost"
          onClick={session.reload}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {openForm && (
        <div className="card">
          <div
            className="card-title"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <LockOpen size={14} /> Buka Sesi Kasir Baru
          </div>
          <form
            onSubmit={handleOpen}
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          >
            <div className="form-group">
              <label className="form-label">ID Kasir *</label>
              <input
                name="cashierId"
                className="form-input"
                value={formData.cashierId}
                onChange={onChange}
                required
                placeholder="e.g. kasir01"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Modal Awal (Rp)</label>
              <input
                name="openingCash"
                type="number"
                min="0"
                className="form-input"
                value={formData.openingCash}
                onChange={onChange}
              />
            </div>
            <div className="form-group" style={{ gridColumn: "1/-1" }}>
              <label className="form-label">Catatan</label>
              <input
                name="notes"
                className="form-input"
                value={formData.notes}
                onChange={onChange}
              />
            </div>
            <div style={{ gridColumn: "1/-1", display: "flex", gap: 8 }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={opening}
              >
                {opening ? "…" : "Buka Sesi"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setOpenForm(false)}
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {closeForm && active && (
        <div className="card">
          <div
            className="card-title"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <Lock size={14} /> Tutup Sesi #{active.id}
          </div>
          <form
            onSubmit={handleClose}
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          >
            <div className="form-group">
              <label className="form-label">Uang Hasil Hitung (Rp) *</label>
              <input
                name="countedCash"
                type="number"
                min="0"
                className="form-input"
                value={formData.countedCash}
                onChange={onChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Operator ID</label>
              <input
                name="cashierId"
                className="form-input"
                value={formData.cashierId}
                onChange={onChange}
                placeholder="ID operator penutup"
              />
            </div>
            <div className="form-group" style={{ gridColumn: "1/-1" }}>
              <label className="form-label">Catatan Penutupan</label>
              <input
                name="notes"
                className="form-input"
                value={formData.notes}
                onChange={onChange}
              />
            </div>
            <div style={{ gridColumn: "1/-1", display: "flex", gap: 8 }}>
              <button
                type="submit"
                className="btn btn-danger"
                disabled={closing}
              >
                {closing ? "…" : "Tutup Sesi"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setCloseForm(false)}
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {active && (
        <>
          <div
            className="stat-grid"
            style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
          >
            <div className="stat-card green">
              <div className="stat-label">Total Pemasukan</div>
              <div className="stat-value" style={{ fontSize: 20 }}>
                Rp{fmt(incomeTotal)}
              </div>
            </div>
            <div className="stat-card red">
              <div className="stat-label">Total Pengeluaran</div>
              <div className="stat-value" style={{ fontSize: 20 }}>
                Rp{fmt(expenseTotal)}
              </div>
            </div>
            <div className="stat-card blue">
              <div className="stat-label">Saldo Sesi</div>
              <div
                className="stat-value"
                style={{
                  fontSize: 20,
                  color:
                    balance >= 0 ? "var(--accent-green)" : "var(--accent-red)",
                }}
              >
                Rp{fmt(balance)}
              </div>
            </div>
          </div>

          <div className="card">
            <div
              className="card-title"
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <FileText size={14} /> Transaksi Sesi #{active.id}
            </div>
            {entries.loading ? (
              <div className="loading-overlay">
                <div className="spinner" />
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Tipe</th>
                    <th>Jumlah</th>
                    <th>Metode</th>
                    <th>Catatan</th>
                    <th>Operator</th>
                  </tr>
                </thead>
                <tbody>
                  {((entries.data?.entries ?? []) as any[]).map((e: any) => (
                    <tr key={e.id}>
                      <td style={{ fontSize: 12 }}>
                        {new Date(e.created_at).toLocaleString("id-ID")}
                      </td>
                      <td>
                        <span
                          className={`badge ${e.entry_type === "income" ? "green" : "red"}`}
                        >
                          {e.entry_type}
                        </span>
                      </td>
                      <td
                        style={{
                          fontWeight: 600,
                          color:
                            e.entry_type === "income"
                              ? "var(--accent-green)"
                              : "var(--accent-red)",
                        }}
                      >
                        {e.entry_type === "income" ? "+" : "-"}Rp{fmt(e.amount)}
                      </td>
                      <td>{e.payment_method}</td>
                      <td style={{ color: "var(--text-muted)" }}>{e.note}</td>
                      <td>{e.operator_id}</td>
                    </tr>
                  ))}
                  {!((entries.data?.entries ?? []) as any[]).length && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          textAlign: "center",
                          color: "var(--text-muted)",
                        }}
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
    </>
  );
}
