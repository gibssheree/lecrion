const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> =
  {
    "Not Ready": { label: "Pending", color: "#92400e", bg: "#fffbeb" },
    confirmed: { label: "Confirmed", color: "#1e40af", bg: "#eff6ff" },
    pending_payment: { label: "Unpaid", color: "#1e40af", bg: "#eff6ff" },
    completed: { label: "Selesai", color: "#166534", bg: "#f0fdf4" },
    cancelled: { label: "Batal", color: "#991b1b", bg: "#fef2f2" },
    Success: { label: "Sukses", color: "#166534", bg: "#f0fdf4" },
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
      }}
    >
      {s.label}
    </span>
  );
}
