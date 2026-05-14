import { useState, FormEvent } from "react";
import { Lock, X, DollarSign, FileText } from "lucide-react";
import { useRegisterStore } from "../../store/register.store";
import { useAuthStore } from "../../store/auth.store";
import { closeRegister } from "../../services/api";
import { useNavigate } from "react-router-dom";

interface Props {
  onClose: () => void;
}

export default function CloseRegisterModal({ onClose }: Props) {
  const [countedCash, setCountedCash] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const session = useRegisterStore((s) => s.session);
  const refresh = useRegisterStore((s) => s.refresh);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

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
      navigate("/register", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menutup sesi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
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
          <div className="alert alert-error" style={{ marginBottom: 14 }}>
            {error}
          </div>
        )}

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
              placeholder="0"
              value={countedCash}
              onChange={(e) => setCountedCash(e.target.value)}
              required
              autoFocus
            />
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
