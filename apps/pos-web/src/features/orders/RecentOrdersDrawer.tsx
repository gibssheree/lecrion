import { useEffect, useState, FormEvent } from "react";
import {
  X,
  RefreshCw,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Printer,
  Ban,
  RotateCcw,
  PackageOpen,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import {
  getOrders,
  getOrderById,
  getPosSaleReceipt,
  voidOrder,
  refundOrder,
  returnItems,
  RefundOrderResponse,
  PosSaleReceipt,
  InlineApprovalResponse,
  ApprovalThresholds,
  getApprovalThresholds,
} from "../../services/api";
import OrderStatusBadge from "./OrderStatusBadge";
import ManagerApprovalModal from "./ManagerApprovalModal";
import { useAuthStore } from "../../store/auth.store";
import { useToast } from "../../store/toast.store";

function fmt(n: number): string {
  return new Intl.NumberFormat("id-ID").format(Math.round(Number(n ?? 0)));
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ── Correction modal types ────────────────────────────────────────────────────

type CorrectionAction = "void" | "refund" | "return";

interface CorrectionModalState {
  orderId: number;
  action: CorrectionAction;
  orderItems?: Array<{
    menu_id: number;
    name: string;
    qty: number;
    price?: number;
  }>;
  orderTotal?: number;
  orderCreatedAt?: string;
}

interface Props {
  onClose: () => void;
}

export default function RecentOrdersDrawer({ onClose }: Props) {
  const toast = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [receiptDetails, setReceiptDetails] = useState<
    Record<number, PosSaleReceipt | null>
  >({});
  const [orderDetails, setOrderDetails] = useState<Record<number, any>>({});
  const [loadingDetail, setLoadingDetail] = useState<number | null>(null);

  // Correction modal state
  const [correctionModal, setCorrectionModal] =
    useState<CorrectionModalState | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await getOrders("all", 50);
      setOrders(res.orders ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  async function toggleExpand(orderId: number) {
    if (expandedId === orderId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(orderId);

    if (!orderDetails[orderId] && !receiptDetails[orderId]) {
      setLoadingDetail(orderId);
      try {
        const [receiptResult, orderResult] = await Promise.allSettled([
          getPosSaleReceipt(orderId),
          getOrderById(orderId),
        ]);

        if (receiptResult.status === "fulfilled") {
          setReceiptDetails((prev) => ({
            ...prev,
            [orderId]: receiptResult.value,
          }));
        } else {
          setReceiptDetails((prev) => ({ ...prev, [orderId]: null }));
        }

        if (orderResult.status === "fulfilled") {
          setOrderDetails((prev) => ({
            ...prev,
            [orderId]: orderResult.value,
          }));
        }
      } catch {
        /* ignore */
      } finally {
        setLoadingDetail(null);
      }
    }
  }

  function handleReprint(orderId: number) {
    const receipt = receiptDetails[orderId];
    if (!receipt) {
      toast.warning("Struk tidak tersedia untuk dicetak ulang");
      return;
    }
    printReceipt(receipt);
  }

  function openCorrectionModal(
    orderId: number,
    action: CorrectionAction,
    detail?: any,
    order?: any,
  ) {
    setCorrectionModal({
      orderId,
      action,
      orderItems: (detail?.order_items ?? []).map((item: any) => ({
        menu_id: item.menu_id,
        name: item.name,
        qty: item.qty,
        price: Number(item.price ?? 0),
      })),
      orderTotal: order?.total ?? detail?.total,
      orderCreatedAt: order?.created_at,
    });
  }

  async function handleCorrectionSuccess(orderId: number) {
    setCorrectionModal(null);
    // Invalidate cached detail so it reloads on next expand
    setOrderDetails((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
    setReceiptDetails((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
    await load();
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, []);

  const today = new Date().toDateString();
  const todayOrders = orders.filter(
    (o) => new Date(o.created_at).toDateString() === today,
  );
  const earlierOrders = orders.filter(
    (o) => new Date(o.created_at).toDateString() !== today,
  );

  const dailyTotal = todayOrders.reduce(
    (sum: number, o: any) =>
      o.status !== "cancelled" &&
      o.status !== "voided" &&
      o.status !== "refunded"
        ? sum + (o.total ?? 0)
        : sum,
    0,
  );

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal orders-modal"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="orders-modal-header">
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ClipboardList size={16} /> Riwayat Transaksi
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={load}
                style={{ padding: "4px 8px" }}
                title="Refresh"
              >
                <RefreshCw size={13} />
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={onClose}
                style={{ padding: "4px 8px" }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Daily summary bar */}
          {todayOrders.length > 0 && (
            <div
              style={{
                padding: "10px 16px",
                background: "var(--primary-light)",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              <span style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
                Hari Ini — {todayOrders.length} transaksi
              </span>
              <span
                style={{
                  fontWeight: 800,
                  color: "var(--primary-dark)",
                  fontSize: 15,
                }}
              >
                Rp{fmt(dailyTotal)}
              </span>
            </div>
          )}

          <div className="orders-modal-body">
            {loading ? (
              <div className="loading-center">
                <div className="spinner" />
              </div>
            ) : !orders.length ? (
              <div className="loading-center">
                <ClipboardList size={32} color="var(--text-muted)" />
                <span style={{ color: "var(--text-muted)" }}>
                  Belum ada transaksi
                </span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {todayOrders.length > 0 && (
                  <>
                    <SectionLabel>Hari Ini</SectionLabel>
                    {todayOrders.map((o) => (
                      <OrderCard
                        key={o.id}
                        order={o}
                        expanded={expandedId === o.id}
                        receipt={receiptDetails[o.id]}
                        detail={orderDetails[o.id]}
                        loadingDetail={loadingDetail === o.id}
                        onToggle={() => toggleExpand(o.id)}
                        onReprint={() => handleReprint(o.id)}
                        onVoid={() =>
                          openCorrectionModal(o.id, "void", orderDetails[o.id], o)
                        }
                        onRefund={() =>
                          openCorrectionModal(
                            o.id,
                            "refund",
                            orderDetails[o.id],
                            o,
                          )
                        }
                        onReturn={() =>
                          openCorrectionModal(
                            o.id,
                            "return",
                            orderDetails[o.id],
                            o,
                          )
                        }
                      />
                    ))}
                  </>
                )}

                {earlierOrders.length > 0 && (
                  <>
                    <SectionLabel style={{ paddingTop: 8 }}>
                      Sebelumnya
                    </SectionLabel>
                    {earlierOrders.map((o) => (
                      <OrderCard
                        key={o.id}
                        order={o}
                        expanded={expandedId === o.id}
                        receipt={receiptDetails[o.id]}
                        detail={orderDetails[o.id]}
                        loadingDetail={loadingDetail === o.id}
                        onToggle={() => toggleExpand(o.id)}
                        onReprint={() => handleReprint(o.id)}
                        onVoid={() =>
                          openCorrectionModal(o.id, "void", orderDetails[o.id], o)
                        }
                        onRefund={() =>
                          openCorrectionModal(
                            o.id,
                            "refund",
                            orderDetails[o.id],
                            o,
                          )
                        }
                        onReturn={() =>
                          openCorrectionModal(
                            o.id,
                            "return",
                            orderDetails[o.id],
                            o,
                          )
                        }
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Correction modal */}
      {correctionModal && (
        <CorrectionModal
          state={correctionModal}
          onSuccess={() => handleCorrectionSuccess(correctionModal.orderId)}
          onClose={() => setCorrectionModal(null)}
        />
      )}
    </>
  );
}

// ── Sub-components ────────────────────────────────────

function SectionLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        padding: "4px 0",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

interface OrderCardProps {
  order: any;
  expanded: boolean;
  receipt: PosSaleReceipt | null | undefined;
  detail: any;
  loadingDetail: boolean;
  onToggle: () => void;
  onReprint: () => void;
  onVoid: () => void;
  onRefund: () => void;
  onReturn: () => void;
}

function OrderCard({
  order: o,
  expanded,
  receipt,
  detail,
  loadingDetail,
  onToggle,
  onReprint,
  onVoid,
  onRefund,
  onReturn,
}: OrderCardProps) {
  const isCancelled =
    o.status === "cancelled" || o.status === "voided" || o.status === "void";
  const isRefunded = o.status === "refunded";
  const isTerminal = isCancelled || isRefunded;
  const displayTotal = receipt?.total ?? o.total;
  const displayPaymentMethod =
    receipt?.paymentMethods?.join(" + ") ?? o.payment_method;

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        borderRadius: "var(--radius-sm)",
        border: `1px solid ${isTerminal ? "#fecaca" : "var(--border)"}`,
        overflow: "hidden",
        opacity: isTerminal ? 0.75 : 1,
      }}
    >
      {/* Summary row */}
      <div
        style={{
          padding: "10px 14px",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
        onClick={onToggle}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontWeight: 700,
                color: "var(--primary)",
                fontSize: 13,
              }}
            >
              #{o.id}
            </span>
            {receipt?.receiptNumber && (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  fontFamily: "monospace",
                }}
              >
                {receipt.receiptNumber}
              </span>
            )}
            <OrderStatusBadge status={o.status} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: "var(--text-primary)",
              }}
            >
              {displayTotal != null ? `Rp${fmt(displayTotal)}` : "—"}
            </span>
            {expanded ? (
              <ChevronUp size={14} color="var(--text-muted)" />
            ) : (
              <ChevronDown size={14} color="var(--text-muted)" />
            )}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          <span>
            {o.name || "Pelanggan umum"} · {displayPaymentMethod}
          </span>
          <span>{fmtTime(o.created_at)}</span>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div
          style={{
            borderTop: "1px solid var(--border)",
            background: "var(--bg-elevated)",
          }}
        >
          {loadingDetail ? (
            <div
              style={{
                padding: 16,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div className="spinner" style={{ width: 16, height: 16 }} />
            </div>
          ) : (
            <ReceiptDetail
              order={o}
              receipt={receipt ?? null}
              detail={detail}
            />
          )}

          <ActionBar
            order={o}
            hasReceipt={!!receipt}
            hasPaidPayment={
              receipt?.paymentLines?.some((line) => Number(line.amount) > 0) ??
              false
            }
            onReprint={onReprint}
            onVoid={onVoid}
            onRefund={onRefund}
            onReturn={onReturn}
          />
        </div>
      )}
    </div>
  );
}

// ── Receipt detail panel ──────────────────────────────

function ReceiptDetail({
  order: o,
  receipt,
  detail,
}: {
  order: any;
  receipt: PosSaleReceipt | null;
  detail: any;
}) {
  const items: Array<{
    name: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
  }> = receipt?.items?.length
    ? receipt.items
    : (detail?.order_items ?? []).map((i: any) => ({
        name: i.name ?? "—",
        qty: i.qty ?? 1,
        unitPrice: Number(i.price ?? 0),
        lineTotal: Number(i.price ?? 0) * Number(i.qty ?? 1),
      }));

  const subtotal =
    receipt?.subtotal ?? items.reduce((s, i) => s + i.lineTotal, 0);
  const total = receipt?.total ?? o.total ?? subtotal;
  const paymentMethods =
    receipt?.paymentMethods?.join(", ") ?? o.payment_method ?? "—";
  const paidTotal = receipt?.paidTotal;
  const change = receipt?.change;
  const hasCash = receipt?.paymentMethods?.some(
    (m) => m.toLowerCase() === "cash",
  );
  const hasDiscount = (receipt?.discountAmount ?? 0) > 0;
  const hasTax = (receipt?.taxAmount ?? 0) > 0;
  const hasServiceCharge = (receipt?.serviceChargeAmount ?? 0) > 0;

  if (!items.length) {
    return (
      <div
        style={{
          padding: "12px 14px",
          fontSize: 12,
          color: "var(--text-muted)",
        }}
      >
        Detail tidak tersedia
      </div>
    );
  }

  return (
    <div>
      {(receipt?.cashierId ||
        receipt?.registerSessionId ||
        receipt?.createdAt) && (
        <div
          style={{
            padding: "8px 14px 6px",
            borderBottom: "1px dashed var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {receipt?.createdAt && (
            <MetaRow label="Waktu" value={fmtDateTime(receipt.createdAt)} />
          )}
          {receipt?.cashierId && (
            <MetaRow label="Kasir" value={receipt.cashierId} />
          )}
          {receipt?.registerSessionId && (
            <MetaRow label="Sesi" value={`#${receipt.registerSessionId}`} />
          )}
        </div>
      )}

      <div style={{ borderBottom: "1px dashed var(--border)" }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              padding: "6px 14px",
              fontSize: 12,
              borderBottom:
                i < items.length - 1 ? "1px solid var(--border)" : "none",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.name}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {item.qty} × Rp{fmt(item.unitPrice)}
              </div>
            </div>
            <span style={{ fontWeight: 600, marginLeft: 8, flexShrink: 0 }}>
              Rp{fmt(item.lineTotal)}
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: "8px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        {receipt && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            <span>Subtotal</span>
            <span>Rp{fmt(subtotal)}</span>
          </div>
        )}
        {hasDiscount && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              color: "#dc2626",
            }}
          >
            <span>Diskon</span>
            <span>−Rp{fmt(receipt!.discountAmount)}</span>
          </div>
        )}
        {hasTax && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            <span>Pajak</span>
            <span>Rp{fmt(receipt!.taxAmount)}</span>
          </div>
        )}
        {hasServiceCharge && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            <span>Service Charge</span>
            <span>Rp{fmt(receipt!.serviceChargeAmount)}</span>
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 13,
            fontWeight: 700,
            borderTop: "1px solid var(--border)",
            paddingTop: 5,
            marginTop: 2,
          }}
        >
          <span>Total</span>
          <span style={{ color: "var(--primary-dark)" }}>Rp{fmt(total)}</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          <span>Metode</span>
          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
            {paymentMethods}
          </span>
        </div>
        {(receipt?.paymentLines?.length ?? 0) > 1 &&
          receipt!.paymentLines.map((line, index) => (
            <div
              key={`${line.method}-${index}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "var(--text-muted)",
                paddingLeft: 8,
              }}
            >
              <span>
                └ {line.method}
                {line.reference ? ` (${line.reference})` : ""}
              </span>
              <span style={{ fontWeight: 600 }}>
                Rp{fmt(line.amount)}
                {line.method.toLowerCase() === "cash" &&
                  line.paidAmount > line.amount && (
                    <span style={{ fontWeight: 400, marginLeft: 4 }}>
                      terima Rp{fmt(line.paidAmount)}
                    </span>
                  )}
              </span>
            </div>
          ))}
        {hasCash && paidTotal != null && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            <span>Diterima</span>
            <span style={{ fontWeight: 600 }}>Rp{fmt(paidTotal)}</span>
          </div>
        )}
        {hasCash && change != null && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              fontWeight: 700,
              color: "#166534",
            }}
          >
            <span>Kembalian</span>
            <span>Rp{fmt(change)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: 11,
        color: "var(--text-muted)",
      }}
    >
      <span>{label}</span>
      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
        {value}
      </span>
    </div>
  );
}

// ── Action bar ────────────────────────────────────────

function ActionBar({
  order: o,
  hasReceipt,
  hasPaidPayment,
  onReprint,
  onVoid,
  onRefund,
  onReturn,
}: {
  order: any;
  hasReceipt: boolean;
  hasPaidPayment: boolean;
  onReprint: () => void;
  onVoid: () => void;
  onRefund: () => void;
  onReturn: () => void;
}) {
  const isTerminal =
    o.status === "cancelled" ||
    o.status === "voided" ||
    o.status === "void" ||
    o.status === "refunded";

  const voidDisabled = isTerminal || hasPaidPayment;
  const refundDisabled = isTerminal;
  // Return items is allowed even after refund (stock restoration is independent)
  const returnDisabled =
    o.status === "cancelled" || o.status === "voided" || o.status === "void";

  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        padding: "8px 14px 10px",
        borderTop: "1px solid var(--border)",
        background: "var(--bg-surface)",
      }}
    >
      <ActionButton
        icon={<Printer size={12} />}
        label="Cetak Ulang"
        onClick={onReprint}
        disabled={!hasReceipt}
        title={
          hasReceipt
            ? "Cetak ulang struk"
            : "Struk tidak tersedia (perlu endpoint Phase 4)"
        }
      />
      <ActionButton
        icon={<Ban size={12} />}
        label="Void"
        onClick={onVoid}
        disabled={voidDisabled}
        danger
        title={
          isTerminal
            ? `Order sudah ${o.status}`
            : hasPaidPayment
              ? "Order sudah dibayar. Gunakan Refund."
              : "Batalkan order (void)"
        }
      />
      <ActionButton
        icon={<RotateCcw size={12} />}
        label="Refund"
        onClick={onRefund}
        disabled={refundDisabled}
        danger
        title={
          refundDisabled ? `Order sudah ${o.status}` : "Refund penuh order ini"
        }
      />
      <ActionButton
        icon={<PackageOpen size={12} />}
        label="Retur"
        onClick={onReturn}
        disabled={returnDisabled}
        title={
          returnDisabled ? `Order sudah ${o.status}` : "Kembalikan stok barang"
        }
      />
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  danger,
  title,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  title?: string;
}) {
  return (
    <button
      className="btn btn-ghost btn-sm"
      style={{
        flex: 1,
        fontSize: 11,
        padding: "5px 6px",
        gap: 4,
        color: danger && !disabled ? "#dc2626" : undefined,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Correction modal ──────────────────────────────────

interface CorrectionModalProps {
  state: {
    orderId: number;
    action: CorrectionAction;
    orderItems?: Array<{
      menu_id: number;
      name: string;
      qty: number;
      price?: number;
    }>;
    orderTotal?: number;
  };
  onSuccess: () => void;
  onClose: () => void;
}

function CorrectionModal({ state, onSuccess, onClose }: CorrectionModalProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Refund item qty selector (partial refund)
  const [refundQtys, setRefundQtys] = useState<Record<number, number>>({});
  // Return item qty selector
  const [returnQtys, setReturnQtys] = useState<Record<number, number>>({});

  // Success state — show correction number
  const [successResult, setSuccessResult] = useState<{
    correctionNumber: string;
    refundAmount?: number;
    status?: string;
    remainingRefundable?: number;
  } | null>(null);

  // Approval state — when policy requires manager PIN
  const [approvalPending, setApprovalPending] = useState(false);
  const [approvalPolicyReason, setApprovalPolicyReason] = useState("");
  const [pendingApproval, setPendingApproval] =
    useState<InlineApprovalResponse | null>(null);
  const [approvalThresholds, setApprovalThresholds] =
    useState<ApprovalThresholds>({
      refundApprovalThresholdIdr: 100_000,
      discountApprovalThresholdIdr: 50_000,
      voidMaxAgeMinutes: 30,
    });

  const user = useAuthStore((s) => s.user);
  const requestedBy = user?.actor ?? "kasir";

  useEffect(() => {
    getApprovalThresholds()
      .then(setApprovalThresholds)
      .catch(() => {
        /* Keep backend-default fallback values if policy fetch fails. */
      });
  }, []);

  const actionLabel =
    state.action === "void"
      ? "Void"
      : state.action === "refund"
        ? "Refund"
        : "Retur Barang";

  const actionColor = state.action === "return" ? "var(--primary)" : "#dc2626";

  // Compute refund preview amount from selected qtys
  const refundPreviewAmount = state.orderItems
    ? Object.entries(refundQtys).reduce((sum, [productId, qty]) => {
        const item = state.orderItems!.find(
          (i) => i.menu_id === Number(productId),
        );
        if (!item || !item.price) return sum;
        return sum + qty * Number(item.price);
      }, 0)
    : 0;

  const hasRefundSelection = Object.values(refundQtys).some((q) => q > 0);
  const isFullRefund = !hasRefundSelection; // no items selected = full refund

  const REFUND_THRESHOLD = approvalThresholds.refundApprovalThresholdIdr;
  const VOID_MAX_AGE_MS = approvalThresholds.voidMaxAgeMinutes * 60 * 1000;

  function checkNeedsApproval(): { needed: boolean; reason: string } {
    if (state.action === "refund") {
      // Use preview amount if partial, or order total for full refund
      const amount = hasRefundSelection
        ? refundPreviewAmount
        : (state.orderTotal ?? 0);
      if (amount > REFUND_THRESHOLD) {
        return {
          needed: true,
          reason: `Refund Rp${new Intl.NumberFormat("id-ID").format(amount)} melebihi batas Rp${new Intl.NumberFormat("id-ID").format(REFUND_THRESHOLD)}`,
        };
      }
    }
    if (state.action === "void" && state.orderCreatedAt) {
      const age = Date.now() - new Date(state.orderCreatedAt).getTime();
      if (age > VOID_MAX_AGE_MS) {
        const ageMin = Math.round(age / 60000);
        return {
          needed: true,
          reason: `Order berumur ${ageMin} menit melebihi batas void ${approvalThresholds.voidMaxAgeMinutes} menit`,
        };
      }
    }
    return { needed: false, reason: "" };
  }

  async function executeCorrection(approval?: InlineApprovalResponse) {
    setLoading(true);
    setError("");

    try {
      if (state.action === "void") {
        const res = await voidOrder(state.orderId, {
          reason,
          ...(approval
            ? {
                managerApprovalId: approval.approvalId,
                approvedBy: approval.approvedBy,
              }
            : {}),
        });
        setSuccessResult({
          correctionNumber: res.correctionNumber,
          status: res.status,
        });
      } else if (state.action === "refund") {
        const items = hasRefundSelection
          ? Object.entries(refundQtys)
              .filter(([, qty]) => qty > 0)
              .map(([productId, refundQty]) => ({
                productId: Number(productId),
                refundQty,
              }))
          : undefined;

        const res: RefundOrderResponse = await refundOrder(state.orderId, {
          items,
          reason,
          ...(approval
            ? {
                managerApprovalId: approval.approvalId,
                approvedBy: approval.approvedBy,
              }
            : {}),
        });
        setSuccessResult({
          correctionNumber: res.correctionNumber,
          refundAmount: res.refundAmount,
          status: res.status,
          remainingRefundable: res.remainingRefundable,
        });
      } else {
        const items = Object.entries(returnQtys)
          .filter(([, qty]) => qty > 0)
          .map(([productId, returnQty]) => ({
            productId: Number(productId),
            returnQty,
          }));
        if (!items.length) {
          setError("Pilih minimal satu produk untuk diretur");
          setLoading(false);
          return;
        }
        const res = await returnItems(state.orderId, { items, reason });
        setSuccessResult({ correctionNumber: res.correctionNumber });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Alasan wajib diisi");
      return;
    }

    // Check if approval is needed
    const { needed, reason: policyReason } = checkNeedsApproval();
    if (needed && !pendingApproval) {
      setApprovalPolicyReason(policyReason);
      setApprovalPending(true);
      return;
    }

    await executeCorrection(pendingApproval ?? undefined);
  }

  function handleApprovalGranted(approval: InlineApprovalResponse) {
    setApprovalPending(false);
    setPendingApproval(approval);
    // Auto-proceed after approval
    executeCorrection(approval);
  }

  // Success screen
  if (successResult) {
    return (
      <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
        <div
          className="modal"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: 400, width: "100%", textAlign: "center" }}
        >
          <div style={{ marginBottom: 16 }}>
            <CheckCircle
              size={40}
              color="var(--stock-ok)"
              style={{ margin: "0 auto 12px" }}
            />
            <h3
              className="modal-title"
              style={{ margin: "0 0 6px", color: "var(--stock-ok)" }}
            >
              {actionLabel} Berhasil
            </h3>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                fontFamily: "monospace",
              }}
            >
              {successResult.correctionNumber}
            </div>
          </div>

          {successResult.refundAmount != null && (
            <div
              style={{
                background: "var(--surface-2, #f0fdf4)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "10px 14px",
                marginBottom: 14,
                fontSize: 13,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>
                  Jumlah Refund
                </span>
                <span style={{ fontWeight: 700, color: "#dc2626" }}>
                  Rp{fmt(successResult.refundAmount)}
                </span>
              </div>
              {successResult.remainingRefundable != null &&
                successResult.remainingRefundable > 0 && (
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>
                      Sisa Refundable
                    </span>
                    <span
                      style={{ fontWeight: 600, color: "var(--stock-low)" }}
                    >
                      Rp{fmt(successResult.remainingRefundable)}
                    </span>
                  </div>
                )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 4,
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>Status Order</span>
                <OrderStatusBadge status={successResult.status ?? ""} />
              </div>
            </div>
          )}

          <button
            className="btn btn-primary btn-full"
            onClick={() => {
              onSuccess();
            }}
          >
            Selesai
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Manager approval modal — shown when policy requires PIN */}
      {approvalPending && (
        <ManagerApprovalModal
          actionType={state.action === "void" ? "void" : "refund"}
          actionDescription={`Order #${state.orderId}`}
          policyReason={approvalPolicyReason}
          requestedBy={requestedBy}
          onApproved={handleApprovalGranted}
          onCancel={() => setApprovalPending(false)}
        />
      )}

      <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
        <div
          className="modal"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: 460, width: "100%" }}
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
              style={{
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: actionColor,
              }}
            >
              {state.action === "void" ? (
                <Ban size={16} />
              ) : state.action === "refund" ? (
                <RotateCcw size={16} />
              ) : (
                <PackageOpen size={16} />
              )}
              {actionLabel} Order #{state.orderId}
            </h3>
            <button
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              style={{ padding: "4px 8px" }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Policy note */}
          <div
            style={{
              background: "#fef9c3",
              border: "1px solid #fde047",
              borderRadius: 6,
              padding: "8px 12px",
              fontSize: 12,
              color: "#713f12",
              marginBottom: 14,
              display: "flex",
              gap: 6,
              alignItems: "flex-start",
            }}
          >
            <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              {state.action === "void" &&
                "Void membatalkan order. Stok tidak dikembalikan otomatis — gunakan Retur Barang jika perlu."}
              {state.action === "refund" &&
                "Pilih item yang akan direfund, atau kosongkan untuk refund penuh. Pembayaran tunai akan mengurangi kas. Stok tidak dikembalikan — gunakan Retur Barang jika perlu."}
              {state.action === "return" &&
                "Retur mengembalikan stok ke gudang. Tidak mempengaruhi pembayaran — gunakan Refund jika perlu kembalikan uang."}
            </span>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 12 }}>
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            {/* Refund item qty selector */}
            {state.action === "refund" &&
              state.orderItems &&
              state.orderItems.length > 0 && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <label className="form-label" style={{ margin: 0 }}>
                      Item yang Direfund
                    </label>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {isFullRefund
                        ? "Semua item (refund penuh)"
                        : `Preview: Rp${fmt(refundPreviewAmount)}`}
                    </span>
                  </div>
                  <div
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      overflow: "hidden",
                    }}
                  >
                    {state.orderItems.map((item) => (
                      <div
                        key={item.menu_id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          borderBottom: "1px solid var(--border)",
                          fontSize: 13,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500 }}>{item.name}</div>
                          <div
                            style={{ fontSize: 11, color: "var(--text-muted)" }}
                          >
                            {item.qty}x
                            {item.price ? ` × Rp${fmt(item.price)}` : ""}
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <label
                            style={{ fontSize: 11, color: "var(--text-muted)" }}
                          >
                            Refund:
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={item.qty}
                            value={refundQtys[item.menu_id] ?? 0}
                            onChange={(e) =>
                              setRefundQtys((prev) => ({
                                ...prev,
                                [item.menu_id]: Math.min(
                                  Number(e.target.value),
                                  item.qty,
                                ),
                              }))
                            }
                            style={{
                              width: 60,
                              padding: "4px 8px",
                              border: "1px solid var(--border)",
                              borderRadius: 4,
                              fontSize: 13,
                              textAlign: "center",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  {hasRefundSelection && refundPreviewAmount > 0 && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: "8px 12px",
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        borderRadius: 6,
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: "var(--text-secondary)" }}>
                        Total Refund
                      </span>
                      <span style={{ fontWeight: 700, color: "#dc2626" }}>
                        Rp{fmt(refundPreviewAmount)}
                      </span>
                    </div>
                  )}
                </div>
              )}

            {/* Return items qty picker */}
            {state.action === "return" &&
              state.orderItems &&
              state.orderItems.length > 0 && (
                <div>
                  <label className="form-label">Produk yang Diretur</label>
                  <div
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      overflow: "hidden",
                    }}
                  >
                    {state.orderItems.map((item) => (
                      <div
                        key={item.menu_id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          borderBottom: "1px solid var(--border)",
                          fontSize: 13,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 500 }}>{item.name}</div>
                          <div
                            style={{ fontSize: 11, color: "var(--text-muted)" }}
                          >
                            Terjual: {item.qty}
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <label
                            style={{ fontSize: 11, color: "var(--text-muted)" }}
                          >
                            Retur:
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={item.qty}
                            value={returnQtys[item.menu_id] ?? 0}
                            onChange={(e) =>
                              setReturnQtys((prev) => ({
                                ...prev,
                                [item.menu_id]: Math.min(
                                  Number(e.target.value),
                                  item.qty,
                                ),
                              }))
                            }
                            style={{
                              width: 60,
                              padding: "4px 8px",
                              border: "1px solid var(--border)",
                              borderRadius: 4,
                              fontSize: 13,
                              textAlign: "center",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Reason */}
            <div>
              <label className="form-label">Alasan *</label>
              <input
                className="form-input"
                placeholder={
                  state.action === "void"
                    ? "Contoh: pelanggan batal, salah input"
                    : state.action === "refund"
                      ? "Contoh: produk tidak sesuai, kelebihan bayar"
                      : "Contoh: produk dikembalikan pelanggan"
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={onClose}
                disabled={loading}
              >
                Batal
              </button>
              <button
                type="submit"
                className={`btn ${state.action === "return" ? "btn-primary" : "btn-danger"}`}
                style={{ flex: 1 }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div
                      className="spinner"
                      style={{ width: 14, height: 14 }}
                    />{" "}
                    Memproses…
                  </>
                ) : (
                  <>
                    {state.action === "void" ? (
                      <Ban size={14} />
                    ) : state.action === "refund" ? (
                      <RotateCcw size={14} />
                    ) : (
                      <PackageOpen size={14} />
                    )}{" "}
                    Konfirmasi {actionLabel}
                    {state.action === "refund" &&
                      hasRefundSelection &&
                      refundPreviewAmount > 0 &&
                      ` (Rp${fmt(refundPreviewAmount)})`}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ── Print helper ──────────────────────────────────────

function printReceipt(receipt: PosSaleReceipt) {
  const items = receipt.items ?? [];
  const hasCash = receipt.paymentMethods?.some(
    (m) => m.toLowerCase() === "cash",
  );
  const hasDiscount = (receipt.discountAmount ?? 0) > 0;
  const hasTax = (receipt.taxAmount ?? 0) > 0;
  const hasSC = (receipt.serviceChargeAmount ?? 0) > 0;
  const paymentLineRows =
    (receipt.paymentLines?.length ?? 0) > 1
      ? receipt.paymentLines
          .map((line) => {
            const isCash = line.method.toLowerCase() === "cash";
            const paidLabel =
              isCash && line.paidAmount > line.amount
                ? ` <span class="muted">(terima Rp${fmt(line.paidAmount)})</span>`
                : "";
            const refLabel = line.reference ? ` (${line.reference})` : "";
            return `<div class="row"><span class="muted">- ${line.method}${refLabel}</span><span>Rp${fmt(line.amount)}${paidLabel}</span></div>`;
          })
          .join("")
      : "";

  const itemRows = items
    .map(
      (i) =>
        `<div class="row"><span class="item-name">${i.name} ×${i.qty}</span><span>Rp${fmt(i.lineTotal)}</span></div>`,
    )
    .join("");

  const win = window.open("", "_blank", "width=400,height=700");
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Struk #${receipt.receiptNumber || receipt.orderId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; background: #fff; padding: 12px; width: 300px; }
    h2 { text-align: center; font-size: 14px; margin-bottom: 4px; }
    .center { text-align: center; font-size: 11px; color: #555; margin-bottom: 2px; }
    .divider { border: none; border-top: 1px dashed #999; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 12px; }
    .row.bold { font-weight: 700; }
    .row.total { font-size: 14px; font-weight: 800; border-top: 1px solid #000; padding-top: 6px; margin-top: 4px; }
    .row.change { font-size: 14px; font-weight: 800; color: #166534; }
    .item-name { flex: 1; }
    .muted { color: #555; }
    .footer { text-align: center; margin-top: 12px; font-size: 11px; color: #555; }
    @media print { body { width: 100%; } }
  </style>
</head>
<body>
  <h2>STRUK PEMBAYARAN</h2>
  ${receipt.receiptNumber ? `<p class="center">#${receipt.receiptNumber}</p>` : ""}
  <p class="center">${receipt.createdAt ? new Date(receipt.createdAt).toLocaleString("id-ID") : ""}</p>
  <hr class="divider" />
  <div class="row"><span class="muted">Order</span><span>#${receipt.orderId}</span></div>
  ${receipt.cashierId ? `<div class="row"><span class="muted">Kasir</span><span>${receipt.cashierId}</span></div>` : ""}
  ${receipt.registerSessionId ? `<div class="row"><span class="muted">Sesi</span><span>#${receipt.registerSessionId}</span></div>` : ""}
  ${receipt.customerName ? `<div class="row"><span class="muted">Pelanggan</span><span>${receipt.customerName}</span></div>` : ""}
  <hr class="divider" />
  ${itemRows}
  <hr class="divider" />
  <div class="row"><span class="muted">Subtotal</span><span>Rp${fmt(receipt.subtotal)}</span></div>
  ${hasDiscount ? `<div class="row" style="color:#dc2626"><span>Diskon</span><span>−Rp${fmt(receipt.discountAmount)}</span></div>` : ""}
  ${hasTax ? `<div class="row"><span class="muted">Pajak</span><span>Rp${fmt(receipt.taxAmount)}</span></div>` : ""}
  ${hasSC ? `<div class="row"><span class="muted">Service Charge</span><span>Rp${fmt(receipt.serviceChargeAmount)}</span></div>` : ""}
  <div class="row total"><span>Total</span><span>Rp${fmt(receipt.total)}</span></div>
  <div class="row"><span class="muted">Metode</span><span>${receipt.paymentMethods?.join(", ") ?? "—"}</span></div>
  ${paymentLineRows}
  ${hasCash ? `<div class="row"><span class="muted">Diterima</span><span>Rp${fmt(receipt.paidTotal)}</span></div>` : ""}
  ${hasCash ? `<div class="row change"><span>Kembalian</span><span>Rp${fmt(receipt.change)}</span></div>` : ""}
  <p class="footer">Terima kasih atas kunjungan Anda</p>
  <script>window.onload = function(){ window.print(); window.close(); }<\/script>
</body>
</html>`);
  win.document.close();
}
