import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  LockOpen,
  DollarSign,
  FileText,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { useRegisterStore } from "../../store/register.store";
import { useAuthStore } from "../../store/auth.store";
import { openRegister } from "../../services/api";

interface Props {
  /** Called after register is successfully opened. If not provided, navigates to '/kasir' */
  onSuccess?: () => void;
  /** Called when user clicks back/cancel. If not provided, navigates back to '/dashboard' */
  onCancel?: () => void;
}

export default function RegisterGatePage({ onSuccess, onCancel }: Props = {}) {
  const [cashierId, setCashierId] = useState("");
  const [openingCash, setOpeningCash] = useState("0");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const refresh = useRegisterStore((s) => s.refresh);
  const user = useAuthStore((s) => s.user);

  // Pre-fill cashier ID from logged-in user
  const defaultCashierId = user?.actor ?? "";

  async function handleOpen(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await openRegister({
        cashierId: cashierId || defaultCashierId,
        openingCash: Number(openingCash) || 0,
        notes,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      // If a session is already open, just refresh and proceed
      if (msg.toLowerCase().includes("already open")) {
        await refresh();
        if (onSuccess) {
          onSuccess();
        } else {
          navigate("/kasir", { replace: true });
        }
        setLoading(false);
        return;
      }
      setError(msg || "Gagal membuka sesi kasir");
      setLoading(false);
      return;
    }
    await refresh();
    if (onSuccess) {
      onSuccess();
    } else {
      navigate("/kasir", { replace: true });
    }
    setLoading(false);
  }

  function handleCancel() {
    if (onCancel) {
      onCancel();
    } else {
      navigate("/dashboard", { replace: true });
    }
  }

  return (
    <div className="register-gate">
      <div className="register-card">
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            <LockOpen size={26} color="#fff" strokeWidth={2.5} />
          </div>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Buka Sesi Kasir
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Tidak ada sesi kasir aktif. Buka sesi untuk mulai transaksi.
          </p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <form
          onSubmit={handleOpen}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <div>
            <label className="form-label">ID Kasir</label>
            <input
              className="form-input"
              placeholder={defaultCashierId || "kasir01"}
              value={cashierId}
              onChange={(e) => setCashierId(e.target.value)}
            />
            {defaultCashierId && !cashierId && (
              <p
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginTop: 4,
                }}
              >
                Kosongkan untuk pakai ID login:{" "}
                <strong>{defaultCashierId}</strong>
              </p>
            )}
          </div>

          <div>
            <label
              className="form-label"
              style={{ display: "flex", alignItems: "center", gap: 5 }}
            >
              <DollarSign size={12} /> Modal Awal (Rp)
            </label>
            <input
              className="form-input"
              type="number"
              min="0"
              step="1000"
              placeholder="0"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
            />
          </div>

          <div>
            <label
              className="form-label"
              style={{ display: "flex", alignItems: "center", gap: 5 }}
            >
              <FileText size={12} /> Catatan (opsional)
            </label>
            <input
              className="form-input"
              placeholder="Shift pagi, dll."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-success btn-full btn-lg"
            disabled={loading}
            style={{ marginTop: 4 }}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: 16, height: 16 }} />{" "}
                Membuka…
              </>
            ) : (
              <>
                <LockOpen size={16} /> Buka Sesi Kasir
              </>
            )}
          </button>
        </form>

        <button
          className="btn btn-ghost btn-full btn-sm"
          style={{ marginTop: 12 }}
          onClick={handleCancel}
        >
          <ArrowLeft size={13} /> Kembali ke Dashboard
        </button>
      </div>
    </div>
  );
}
