// apps/pos-web/src/pages/OrderDetailPage.tsx
//
// Full detail view for a single order — accessed via /orders/:id

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Printer } from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import { getOrderById, getPosSaleReceipt, updateOrderStatus } from "../services/api";
import { useToast } from "../store/toast.store";
import { fmt } from "../utils/fmt";
import OrderStatusBadge from "../features/orders/OrderStatusBadge";
import Select from "../components/ui/Select";

const STATUS_LABEL: Record<string, string> = {
  "Not Ready": "Baru",
  confirmed: "Dikonfirmasi",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  pending_payment: "Menunggu Bayar",
  voided: "Void",
  refunded: "Refund",
};

const TYPE_LABEL: Record<string, string> = {
  pickup: "Ambil Sendiri",
  dine_in: "Makan di Tempat",
  delivery: "Pengiriman",
};

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [order, setOrder] = useState<any>(null);
  const [receipt, setReceipt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const [orderRes, receiptRes] = await Promise.allSettled([
        getOrderById(Number(id)),
        getPosSaleReceipt(Number(id)),
      ]);
      if (orderRes.status === "fulfilled") setOrder(orderRes.value);
      else setError("Order tidak ditemukan");
      if (receiptRes.status === "fulfilled") setReceipt(receiptRes.value);
    } catch {
      setError("Gagal memuat order");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleStatusChange(newStatus: string) {
    if (!id) return;
    setUpdating(true);
    try {
      await updateOrderStatus(Number(id), newStatus);
      await load();
      toast.success(`Status diperbarui ke "${STATUS_LABEL[newStatus] ?? newStatus}"`);
    } catch (e: any) {
      toast.error(e.message ?? "Gagal update status");
    } finally {
      setUpdating(false);
    }
  }

  function handlePrint() {
    if (!receipt && !order) return;
    const r = receipt;
    const items: any[] = r?.items ?? order?.order_items ?? order?.sale_items ?? [];
    const win = window.open("", "_blank", "width=400,height=700");
    if (!win) return;
    const rows = items.map((i: any) =>
      `<div class="row"><span>${i.name ?? i.product_name} ×${i.qty ?? i.quantity}</span><span>Rp${fmt((i.qty ?? i.quantity) * (i.unitPrice ?? i.price ?? i.unit_price))}</span></div>`
    ).join("");
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:monospace;font-size:12px;padding:12px;width:300px}
      h2{text-align:center;font-size:14px;margin-bottom:6px}.row{display:flex;justify-content:space-between;margin:3px 0}
      .total{font-weight:700;font-size:14px;border-top:1px solid #000;padding-top:6px;margin-top:4px}
      @media print{body{width:100%}}</style></head><body>
      <h2>STRUK PEMBAYARAN</h2>
      <p style="text-align:center;font-size:11px">#${r?.receiptNumber ?? order?.id}</p>
      <hr style="border-top:1px dashed #999;margin:6px 0"/>
      ${rows}
      <hr style="border-top:1px dashed #999;margin:6px 0"/>
      <div class="row total"><span>Total</span><span>Rp${fmt(r?.total ?? order?.total)}</span></div>
      <p style="text-align:center;margin-top:10px;font-size:11px">Terima kasih</p>
      <script>window.onload=function(){window.print();window.close();}<\/script>
    </body></html>`);
    win.document.close();
  }

  const items: any[] =
    receipt?.items ??
    order?.order_items ??
    order?.sale_items ??
    order?.items ??
    [];

  const isTerminal = ["cancelled", "voided", "void", "refunded"].includes(order?.status ?? "");

  return (
    <PosAppShell title="">
      {/* Back button + title */}
      <div className="detail-header">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate("/orders")}>
          <ArrowLeft size={14} /> Pesanan
        </button>
        <span className="detail-header-title">
          Order #{id}
        </span>
        {order && <OrderStatusBadge status={order.status} />}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={load} title="Refresh">
            <RefreshCw size={13} />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handlePrint} title="Cetak struk">
            <Printer size={13} /> Cetak
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-center" style={{ minHeight: 200 }}>
          <div className="spinner" />
        </div>
      ) : error ? (
        <div className="alert alert-warning">{error}</div>
      ) : !order ? null : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Left column */}
          <div>
            {/* Order info */}
            <div className="detail-card">
              <div className="detail-card-title">Informasi Order</div>
              <div className="detail-row">
                <span className="detail-row-label">Order ID</span>
                <span className="detail-row-value">#{order.id}</span>
              </div>
              {receipt?.receiptNumber && (
                <div className="detail-row">
                  <span className="detail-row-label">No. Struk</span>
                  <span className="detail-row-value" style={{ fontFamily: "monospace" }}>{receipt.receiptNumber}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-row-label">Pelanggan</span>
                <span className="detail-row-value">{order.name || receipt?.customerName || "Umum"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Tipe</span>
                <span className="detail-row-value">{TYPE_LABEL[order.type ?? ""] ?? order.type ?? "—"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Tanggal</span>
                <span className="detail-row-value">{fmtDateTime(order.created_at)}</span>
              </div>
              {receipt?.cashierId && (
                <div className="detail-row">
                  <span className="detail-row-label">Kasir</span>
                  <span className="detail-row-value">{receipt.cashierId}</span>
                </div>
              )}
              {receipt?.registerSessionId && (
                <div className="detail-row">
                  <span className="detail-row-label">Sesi Register</span>
                  <span className="detail-row-value">#{receipt.registerSessionId}</span>
                </div>
              )}
              {order.note && (
                <div className="detail-row">
                  <span className="detail-row-label">Catatan</span>
                  <span className="detail-row-value">{order.note}</span>
                </div>
              )}
            </div>

            {/* Status update */}
            {!isTerminal && (
              <div className="detail-card">
                <div className="detail-card-title">Update Status</div>
                <div style={{ padding: "12px 16px", display: "flex", gap: 8, alignItems: "center" }}>
                  <Select
                    value={order.status}
                    disabled={updating}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    {["Not Ready", "confirmed", "completed", "cancelled"].map((s) => (
                      <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>
                    ))}
                  </Select>
                  {updating && <div className="spinner" style={{ width: 14, height: 14 }} />}
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div>
            {/* Items */}
            <div className="detail-card">
              <div className="detail-card-title">Item ({items.length})</div>
              {items.length === 0 ? (
                <div style={{ padding: "14px 16px", color: "var(--text-muted)", fontSize: 13 }}>
                  Detail item tidak tersedia
                </div>
              ) : (
                <table className="pos-data-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Produk</th>
                      <th style={{ textAlign: "center" }}>Qty</th>
                      <th style={{ textAlign: "right" }}>Harga</th>
                      <th style={{ textAlign: "right" }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: any, i: number) => {
                      const qty = item.qty ?? item.quantity ?? 1;
                      const price = item.unitPrice ?? item.price ?? item.unit_price ?? 0;
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight: 500 }}>{item.name ?? item.product_name ?? `#${item.productId ?? item.product_id}`}</td>
                          <td style={{ textAlign: "center" }}>{qty}</td>
                          <td style={{ textAlign: "right" }}>Rp{fmt(price)}</td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>
                            Rp{fmt(item.lineTotal ?? qty * price)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Payment summary */}
            <div className="detail-card">
              <div className="detail-card-title">Pembayaran</div>
              {receipt?.subtotal != null && (
                <div className="detail-row">
                  <span className="detail-row-label">Subtotal</span>
                  <span className="detail-row-value">Rp{fmt(receipt.subtotal)}</span>
                </div>
              )}
              {(receipt?.discountAmount ?? 0) > 0 && (
                <div className="detail-row">
                  <span className="detail-row-label">Diskon</span>
                  <span className="detail-row-value" style={{ color: "#dc2626" }}>−Rp{fmt(receipt.discountAmount)}</span>
                </div>
              )}
              {(receipt?.taxAmount ?? 0) > 0 && (
                <div className="detail-row">
                  <span className="detail-row-label">Pajak</span>
                  <span className="detail-row-value">Rp{fmt(receipt.taxAmount)}</span>
                </div>
              )}
              <div className="detail-row" style={{ fontWeight: 800, fontSize: 15 }}>
                <span className="detail-row-label" style={{ fontWeight: 700, color: "var(--text-primary)" }}>Total</span>
                <span style={{ color: "var(--primary-dark)" }}>Rp{fmt(receipt?.total ?? order.total)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Metode</span>
                <span className="detail-row-value">
                  {receipt?.paymentMethods?.join(", ") ?? order.payment_method ?? "—"}
                </span>
              </div>
              {receipt?.paidTotal != null && (
                <div className="detail-row">
                  <span className="detail-row-label">Diterima</span>
                  <span className="detail-row-value">Rp{fmt(receipt.paidTotal)}</span>
                </div>
              )}
              {receipt?.change != null && receipt.change > 0 && (
                <div className="detail-row">
                  <span className="detail-row-label">Kembalian</span>
                  <span className="detail-row-value" style={{ color: "#166534" }}>Rp{fmt(receipt.change)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PosAppShell>
  );
}
