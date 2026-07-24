import { useMemo, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  History,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldX,
} from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import { useApi } from "../hooks/useApi";
import { PosCorrectionListItem, listPosCorrections } from "../services/api";
import { fmt, fmtDateTime } from "../utils/fmt";
import { usePagination } from "../hooks/usePagination";
import Pagination from "../components/ui/Pagination";

const TYPE_META: Record<
  PosCorrectionListItem["type"],
  { label: string; bg: string; color: string; icon: any }
> = {
  void: {
    label: "Void",
    bg: "var(--bg-elevated)",
    color: "var(--text-secondary)",
    icon: ShieldX,
  },
  refund: {
    label: "Refund",
    bg: "var(--stock-out-bg)",
    color: "var(--stock-out)",
    icon: RotateCcw,
  },
  return: {
    label: "Retur Barang",
    bg: "var(--primary-light)",
    color: "var(--info)",
    icon: History,
  },
};

export default function ReturnsPage() {
  const [typeFilter, setTypeFilter] = useState<
    "all" | PosCorrectionListItem["type"]
  >("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const corrections = useApi(
    () =>
      listPosCorrections({
        type: typeFilter === "all" ? undefined : typeFilter,
        limit: 200,
      }),
    [typeFilter],
    { autoRefreshMs: 60_000 },
  );

  const allRows = corrections.data?.items ?? [];

  const filteredRows = useMemo(() => {
    if (!search.trim()) return allRows;
    const lower = search.trim().toLowerCase();
    return allRows.filter(
      (row) =>
        row.correctionNumber.toLowerCase().includes(lower) ||
        row.receiptNumber?.toLowerCase().includes(lower) ||
        row.reason.toLowerCase().includes(lower) ||
        row.operatorId.toLowerCase().includes(lower) ||
        String(row.orderId).includes(lower),
    );
  }, [allRows, search]);

  const stats = useMemo(() => {
    const refundTotal = allRows
      .filter((r) => r.type === "refund")
      .reduce((sum, r) => sum + r.amount, 0);
    return {
      voids: allRows.filter((r) => r.type === "void").length,
      refunds: allRows.filter((r) => r.type === "refund").length,
      returns: allRows.filter((r) => r.type === "return").length,
      refundTotal,
    };
  }, [allRows]);

  const pagination = usePagination(filteredRows, 20);

  return (
    <PosAppShell title="Retur / Refund">
      <div
        className="summary-grid"
        style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}
      >
        <div className="summary-card">
          <div className="summary-card-label">
            <ShieldX size={13} /> Void
          </div>
          <div className="summary-card-value">{stats.voids}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <RotateCcw size={13} color="var(--stock-out)" /> Refund
          </div>
          <div
            className="summary-card-value"
            style={{ color: "var(--stock-out)" }}
          >
            {stats.refunds}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <History size={13} color="var(--info)" /> Retur Barang
          </div>
          <div className="summary-card-value" style={{ color: "var(--info)" }}>
            {stats.returns}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Total Refund (Rp)</div>
          <div
            className="summary-card-value"
            style={{ color: "var(--stock-out)" }}
          >
            Rp{fmt(stats.refundTotal)}
          </div>
        </div>
      </div>

      <div className="dashboard-card">
        <div
          className="dashboard-card-header"
          style={{ gap: 8, flexWrap: "wrap" }}
        >
          <Search size={14} color="var(--text-muted)" />
          <input
            className="form-input"
            placeholder="Cari nomor koreksi, receipt, alasan…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 280 }}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className={`chip${typeFilter === "all" ? " chip--active" : ""}`}
              onClick={() => setTypeFilter("all")}
            >
              Semua ({allRows.length})
            </button>
            {(
              Object.keys(TYPE_META) as Array<PosCorrectionListItem["type"]>
            ).map((key) => (
              <button
                key={key}
                className={`chip${typeFilter === key ? " chip--active" : ""}`}
                onClick={() => setTypeFilter(key)}
              >
                {TYPE_META[key].label}
              </button>
            ))}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={corrections.reload}
            style={{ marginLeft: "auto" }}
          >
            <RefreshCw size={13} />
          </button>
        </div>

        <div className="dashboard-card-body" style={{ padding: 0 }}>
          {corrections.loading ? (
            <div className="loading-center">
              <div className="spinner" />
            </div>
          ) : (
            <table className="pos-data-table">
              <thead>
                <tr>
                  <th>Nomor Koreksi</th>
                  <th>Tipe</th>
                  <th>Order / Receipt</th>
                  <th>Alasan</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th>Operator</th>
                  <th>Waktu</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pagination.slice.map((row) => {
                  const meta = TYPE_META[row.type];
                  const Icon = meta.icon;
                  const isExpanded = expanded === row.id;
                  return (
                    <>
                      <tr key={row.id}>
                        <td
                          style={{
                            fontWeight: 600,
                            fontFamily: "monospace",
                            fontSize: 12,
                          }}
                        >
                          {row.correctionNumber}
                        </td>
                        <td>
                          <span
                            className="stock-badge"
                            style={{
                              background: meta.bg,
                              color: meta.color,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Icon size={11} />
                            {meta.label}
                          </span>
                        </td>
                        <td style={{ fontSize: 12 }}>
                          <strong>#{row.orderId}</strong>
                          {row.receiptNumber && (
                            <div
                              style={{
                                color: "var(--text-muted)",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <Receipt size={10} /> {row.receiptNumber}
                            </div>
                          )}
                        </td>
                        <td
                          style={{
                            fontSize: 12,
                            color: "var(--text-secondary)",
                            maxWidth: 240,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={row.reason}
                        >
                          {row.reason}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontWeight: 700,
                            color:
                              row.amount > 0
                                ? "var(--stock-out)"
                                : "var(--text-muted)",
                          }}
                        >
                          {row.amount > 0 ? `Rp${fmt(row.amount)}` : "—"}
                        </td>
                        <td style={{ fontSize: 12 }}>{row.operatorId}</td>
                        <td
                          style={{ fontSize: 12, color: "var(--text-muted)" }}
                        >
                          {fmtDateTime(row.createdAt)}
                        </td>
                        <td>
                          {row.metadata && (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() =>
                                setExpanded((current) =>
                                  current === row.id ? null : row.id,
                                )
                              }
                            >
                              {isExpanded ? (
                                <ChevronUp size={12} />
                              ) : (
                                <ChevronDown size={12} />
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && row.metadata && (
                        <tr key={`expand-${row.id}`}>
                          <td
                            colSpan={8}
                            style={{ background: "var(--bg-elevated)" }}
                          >
                            <CorrectionDetail metadata={row.metadata} />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
                {!filteredRows.length && (
                  <tr>
                    <td
                      colSpan={8}
                      style={{
                        textAlign: "center",
                        color: "var(--text-muted)",
                        padding: 32,
                      }}
                    >
                      <AlertCircle
                        size={28}
                        style={{ opacity: 0.3, marginBottom: 8 }}
                      />
                      <div>Belum ada catatan retur, refund, atau void.</div>
                      <div style={{ fontSize: 11 }}>
                        Aksi koreksi dapat dilakukan dari halaman Pesanan.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <Pagination {...pagination} />
      </div>
    </PosAppShell>
  );
}

function CorrectionDetail({ metadata }: { metadata: any }) {
  if (!metadata) return null;

  const refundedLines = metadata.refundedLines as
    | Array<{
        productId: number;
        name: string;
        refundQty: number;
        unitPrice: number;
        lineRefundAmount: number;
      }>
    | undefined;

  const returnedItems = metadata.returnedItems as
    | Array<{
        productId: number;
        name: string;
        returnQty: number;
        stockBefore: number;
        stockAfter: number;
      }>
    | undefined;

  const allocations = metadata.paymentAllocations as
    | Array<{
        method: string;
        refundAmount: number;
        isCash: boolean;
      }>
    | undefined;

  return (
    <div
      style={{
        padding: "12px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {refundedLines?.length ? (
        <div>
          <strong style={{ fontSize: 12 }}>Item Refund</strong>
          <table className="pos-data-table" style={{ marginTop: 4 }}>
            <thead>
              <tr>
                <th>Produk</th>
                <th style={{ textAlign: "right" }}>Qty</th>
                <th style={{ textAlign: "right" }}>Unit Price</th>
                <th style={{ textAlign: "right" }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {refundedLines.map((line) => (
                <tr key={line.productId}>
                  <td>{line.name}</td>
                  <td style={{ textAlign: "right" }}>{line.refundQty}</td>
                  <td style={{ textAlign: "right" }}>
                    Rp{fmt(line.unitPrice)}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>
                    Rp{fmt(line.lineRefundAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {returnedItems?.length ? (
        <div>
          <strong style={{ fontSize: 12 }}>Item Diretur</strong>
          <table className="pos-data-table" style={{ marginTop: 4 }}>
            <thead>
              <tr>
                <th>Produk</th>
                <th style={{ textAlign: "right" }}>Qty Retur</th>
                <th style={{ textAlign: "right" }}>Stok Sebelum</th>
                <th style={{ textAlign: "right" }}>Stok Sesudah</th>
              </tr>
            </thead>
            <tbody>
              {returnedItems.map((item) => (
                <tr key={item.productId}>
                  <td>{item.name}</td>
                  <td style={{ textAlign: "right" }}>{item.returnQty}</td>
                  <td style={{ textAlign: "right" }}>
                    {fmt(item.stockBefore)}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>
                    {fmt(item.stockAfter)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {allocations?.length ? (
        <div>
          <strong style={{ fontSize: 12 }}>Alokasi Pembayaran</strong>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginTop: 4,
            }}
          >
            {allocations.map((alloc, i) => (
              <span
                key={i}
                className="stock-badge"
                style={{
                  background: alloc.isCash
                    ? "var(--stock-ok-bg)"
                    : "var(--primary-light)",
                  color: alloc.isCash ? "var(--stock-ok)" : "var(--info)",
                }}
              >
                {alloc.method}: Rp{fmt(alloc.refundAmount)}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
