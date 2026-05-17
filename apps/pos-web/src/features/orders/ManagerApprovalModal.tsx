/**
 * ManagerApprovalModal — PIN entry modal for sensitive POS actions.
 *
 * Used when a correction action (void/refund/discount) exceeds the
 * configured approval threshold and requires manager authorization.
 *
 * The manager enters their PIN on the same device (inline approval).
 * The approvalId returned is passed back to the caller for attachment
 * to the correction request.
 */

import { useState, useRef, useEffect, FormEvent } from "react";
import { X, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { inlineApprove, InlineApprovalResponse } from "../../services/api";

export type ApprovalActionType =
  | "refund"
  | "void"
  | "discount_override"
  | "price_override";

interface Props {
  /** The action requiring approval */
  actionType: ApprovalActionType;
  /** Human-readable description of what is being approved */
  actionDescription: string;
  /** Why approval is required (policy reason) */
  policyReason: string;
  /** The cashier requesting approval */
  requestedBy: string;
  /** Called when manager approves — passes the approval response */
  onApproved: (approval: InlineApprovalResponse) => void;
  /** Called when modal is dismissed without approval */
  onCancel: () => void;
}

const ACTION_LABELS: Record<ApprovalActionType, string> = {
  refund: "Refund",
  void: "Void",
  discount_override: "Diskon",
  price_override: "Override Harga",
};

export default function ManagerApprovalModal({
  actionType,
  actionDescription,
  policyReason,
  requestedBy,
  onApproved,
  onCancel,
}: Props) {
  const [pin, setPin] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [reason, setReason] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus PIN input when modal opens
    setTimeout(() => pinRef.current?.focus(), 50);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!pin || pin.length < 4) {
      setError("PIN minimal 4 digit");
      return;
    }
    if (!approvedBy.trim()) {
      setError("Nama manajer wajib diisi");
      return;
    }
    if (!reason.trim()) {
      setError("Alasan persetujuan wajib diisi");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await inlineApprove({
        approvalType: actionType,
        requestedBy,
        approvedBy: approvedBy.trim(),
        reason: reason.trim(),
        managerPin: pin,
      });
      onApproved(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Persetujuan gagal";
      // Distinguish PIN error from other errors
      if (msg.toLowerCase().includes("pin")) {
        setError("PIN manajer salah. Coba lagi.");
        setPin("");
        pinRef.current?.focus();
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel} style={{ zIndex: 1200 }}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 400, width: "100%" }}
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
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "var(--primary-dark)",
            }}
          >
            <ShieldCheck size={18} color="var(--primary)" />
            Persetujuan Manajer
          </h3>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onCancel}
            style={{ padding: "4px 8px" }}
            disabled={loading}
          >
            <X size={16} />
          </button>
        </div>

        {/* Context */}
        <div
          style={{
            background: "var(--bg-elevated)",
            borderRadius: 6,
            padding: "10px 14px",
            marginBottom: 14,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Tindakan
          </div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {ACTION_LABELS[actionType]}: {actionDescription}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#92400e",
              background: "#fffbeb",
              border: "1px solid #fde047",
              borderRadius: 4,
              padding: "4px 8px",
              marginTop: 4,
            }}
          >
            {policyReason}
          </div>
          <div
            style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}
          >
            Diminta oleh: <strong>{requestedBy}</strong>
          </div>
        </div>

        {error && (
          <div
            className="alert alert-error"
            style={{ marginBottom: 12, fontSize: 13 }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          {/* Manager name */}
          <div>
            <label className="form-label">Nama Manajer</label>
            <input
              className="form-input"
              type="text"
              placeholder="Nama manajer yang menyetujui"
              value={approvedBy}
              onChange={(e) => setApprovedBy(e.target.value)}
              disabled={loading}
              style={{ fontSize: 13 }}
            />
          </div>

          {/* Reason */}
          <div>
            <label className="form-label">Alasan Persetujuan</label>
            <input
              className="form-input"
              type="text"
              placeholder="Alasan menyetujui tindakan ini…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              style={{ fontSize: 13 }}
            />
          </div>

          {/* PIN */}
          <div>
            <label className="form-label">PIN Manajer</label>
            <div style={{ position: "relative" }}>
              <input
                ref={pinRef}
                className="form-input"
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Masukkan PIN manajer"
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 8))
                }
                disabled={loading}
                style={{
                  fontSize: 20,
                  letterSpacing: showPin ? 2 : 6,
                  fontWeight: 700,
                  paddingRight: 40,
                }}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowPin((v) => !v)}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: 0,
                }}
                tabIndex={-1}
              >
                {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ flex: 1 }}
              onClick={onCancel}
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 2, fontWeight: 700 }}
              disabled={loading || !pin || !approvedBy.trim() || !reason.trim()}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 14, height: 14 }} />{" "}
                  Memverifikasi…
                </>
              ) : (
                <>
                  <ShieldCheck size={14} /> Setujui
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
