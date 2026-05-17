const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> =
  {
    // Legacy / bot statuses
    "Not Ready": { label: "Pending", color: "#92400e", bg: "#fffbeb" },
    Success: { label: "Sukses", color: "#166534", bg: "#f0fdf4" },

    // POS statuses
    pending: { label: "Pending", color: "#92400e", bg: "#fffbeb" },
    pending_payment: { label: "Belum Bayar", color: "#1e40af", bg: "#eff6ff" },
    confirmed: { label: "Dikonfirmasi", color: "#1e40af", bg: "#eff6ff" },
    paid: { label: "Lunas", color: "#166534", bg: "#f0fdf4" },
    completed: { label: "Selesai", color: "#166534", bg: "#f0fdf4" },
    cancelled: { label: "Batal", color: "#991b1b", bg: "#fef2f2" },
    refunded: { label: "Refund", color: "#7c3aed", bg: "#f5f3ff" },
    partially_refunded: {
      label: "Refund Sebagian",
      color: "#7c3aed",
      bg: "#f5f3ff",
    },
    voided: { label: "Void", color: "#991b1b", bg: "#fef2f2" },
    void: { label: "Void", color: "#991b1b", bg: "#fef2f2" },
  };

export default function OrderStatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? {
    label: status,
    color: "#475569",
    bg: "#f1f5f9",
  };
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 600,
        background: s.bg,
        color: s.color,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}
