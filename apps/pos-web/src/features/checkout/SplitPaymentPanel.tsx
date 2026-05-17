/**
 * SplitPaymentPanel — multi-tender payment UI.
 *
 * Supports single-method (common case) and split payment.
 * Single-method mode is the default; cashier clicks "+ Bayar Lagi" to add a second line.
 * The panel is compact and cashier-friendly.
 */

import { Plus, Trash2, ChevronsRight } from "lucide-react";
import { TenderLine, useTenderLines } from "./useTenderLines";

const METHODS = ["Cash", "Transfer", "QRIS"];

function fmt(n: number): string {
  return new Intl.NumberFormat("id-ID").format(Math.round(Number(n ?? 0)));
}

function getPresets(total: number): number[] {
  const base = [5000, 10000, 20000, 50000, 100000, 200000];
  const roundUp = Math.ceil(total / 10000) * 10000;
  const all = Array.from(new Set([...base, roundUp, total])).sort(
    (a, b) => a - b,
  );
  return all.filter((v) => v >= total).slice(0, 5);
}

interface Props {
  tender: ReturnType<typeof useTenderLines>;
  total: number;
}

export default function SplitPaymentPanel({ tender, total }: Props) {
  const isSplit = tender.lines.length > 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Method selector — single mode */}
      {!isSplit && (
        <SingleMethodSelector
          line={tender.lines[0]}
          total={total}
          tender={tender}
        />
      )}

      {/* Split mode: render each line */}
      {isSplit && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.4px",
            }}
          >
            Pembayaran Terbagi
          </div>

          {tender.lines.map((line, idx) => (
            <TenderLineRow
              key={line.id}
              line={line}
              index={idx}
              total={total}
              tender={tender}
              canRemove={tender.lines.length > 1}
            />
          ))}

          {/* Remaining indicator */}
          {tender.remaining > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 10px",
                background: "var(--stock-out-bg)",
                borderRadius: "var(--radius-sm)",
                fontSize: 12,
                color: "var(--stock-out)",
                fontWeight: 600,
              }}
            >
              <span>Sisa belum dialokasi</span>
              <span>Rp{fmt(tender.remaining)}</span>
            </div>
          )}

          {tender.isFullyAllocated && tender.change > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 10px",
                background: "var(--stock-ok-bg)",
                borderRadius: "var(--radius-sm)",
                fontSize: 12,
                color: "var(--stock-ok)",
                fontWeight: 600,
              }}
            >
              <span>Kembalian Cash</span>
              <span>Rp{fmt(tender.change)}</span>
            </div>
          )}
        </div>
      )}

      {/* Add split line button */}
      <div style={{ display: "flex", gap: 6 }}>
        {METHODS.map((m) => (
          <button
            key={m}
            className="btn btn-ghost btn-sm"
            style={{
              flex: 1,
              fontSize: 11,
              padding: "5px 4px",
              gap: 3,
              opacity: tender.isFullyAllocated ? 0.4 : 1,
            }}
            disabled={tender.isFullyAllocated}
            onClick={() => {
              if (isSplit) {
                tender.addLine(m);
              } else {
                // Switch to split: set current line amount to partial, add new line
                tender.addLine(m);
              }
            }}
            title={`Tambah pembayaran ${m}`}
          >
            <Plus size={10} /> {m}
          </button>
        ))}
      </div>

      {isSplit && (
        <button
          className="btn btn-ghost btn-sm"
          style={{ fontSize: 11, color: "var(--text-muted)" }}
          onClick={() => tender.setSingleMethod("Cash")}
        >
          ↩ Kembali ke satu metode
        </button>
      )}
    </div>
  );
}

// ── Single method mode ────────────────────────────────

function SingleMethodSelector({
  line,
  total,
  tender,
}: {
  line: TenderLine;
  total: number;
  tender: ReturnType<typeof useTenderLines>;
}) {
  const isCash = line.method.toLowerCase() === "cash";
  const cashAmt = parseFloat(line.amount) || total;
  const paidAmt = parseFloat(line.paidAmount) || cashAmt;
  const change = isCash ? Math.max(0, paidAmt - cashAmt) : 0;
  const presets = getPresets(total);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Method buttons */}
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-muted)",
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: "0.4px",
          }}
        >
          Metode Bayar
        </div>
        <div className="payment-methods">
          {METHODS.map((m) => (
            <button
              key={m}
              className={`payment-method-btn ${line.method === m ? "payment-method-btn--active" : ""}`}
              onClick={() => tender.setSingleMethod(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Cash input */}
      {isCash && total > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Quick presets */}
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-muted)",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.4px",
              }}
            >
              Nominal Cepat
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => tender.setLineField(line.id, "paidAmount", "")}
                style={{
                  padding: "5px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: `1px solid ${line.paidAmount === "" ? "var(--primary)" : "var(--border)"}`,
                  background:
                    line.paidAmount === ""
                      ? "var(--primary-light)"
                      : "var(--bg-elevated)",
                  color:
                    line.paidAmount === ""
                      ? "var(--primary)"
                      : "var(--text-secondary)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cash Pas
              </button>
              {presets.map((p) => {
                const active = parseFloat(line.paidAmount) === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() =>
                      tender.setLineField(line.id, "paidAmount", String(p))
                    }
                    style={{
                      padding: "5px 10px",
                      borderRadius: "var(--radius-sm)",
                      border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`,
                      background: active
                        ? "var(--primary-light)"
                        : "var(--bg-elevated)",
                      color: active
                        ? "var(--primary)"
                        : "var(--text-secondary)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {p === total ? "PAS" : `Rp${fmt(p)}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Manual input */}
          <div>
            <label
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-muted)",
                display: "block",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.4px",
              }}
            >
              Uang Diterima (Rp)
            </label>
            <input
              className="form-input"
              type="number"
              min={0}
              step="1000"
              placeholder={`Kosong = cash pas Rp${fmt(total)}`}
              value={line.paidAmount}
              onChange={(e) =>
                tender.setLineField(line.id, "paidAmount", e.target.value)
              }
              style={{ fontSize: 18, fontWeight: 700, textAlign: "right" }}
              autoFocus
            />
          </div>

          {/* Change display */}
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "var(--radius-sm)",
              background:
                change >= 0 ? "var(--stock-ok-bg)" : "var(--stock-out-bg)",
              border: `1px solid ${change >= 0 ? "var(--stock-ok)" : "var(--stock-out)"}`,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                marginBottom: 2,
              }}
            >
              Kembalian
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: change >= 0 ? "var(--stock-ok)" : "var(--stock-out)",
              }}
            >
              Rp{fmt(change)}
            </div>
            {line.paidAmount === "" && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginTop: 2,
                }}
              >
                Cash pas: Rp{fmt(total)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Non-cash: show reference input */}
      {!isCash && total > 0 && (
        <div>
          <label
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-muted)",
              display: "block",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: "0.4px",
            }}
          >
            Referensi (opsional)
          </label>
          <input
            className="form-input"
            type="text"
            placeholder={`No. referensi ${line.method}…`}
            value={line.reference}
            onChange={(e) =>
              tender.setLineField(line.id, "reference", e.target.value)
            }
            style={{ fontSize: 13 }}
          />
        </div>
      )}
    </div>
  );
}

// ── Split tender line row ─────────────────────────────

function TenderLineRow({
  line,
  index,
  total,
  tender,
  canRemove,
}: {
  line: TenderLine;
  index: number;
  total: number;
  tender: ReturnType<typeof useTenderLines>;
  canRemove: boolean;
}) {
  const isCash = line.method.toLowerCase() === "cash";
  const lineAmt = parseFloat(line.amount) || 0;
  const paidAmt = isCash ? parseFloat(line.paidAmount) || lineAmt : lineAmt;
  const lineChange = isCash ? Math.max(0, paidAmt - lineAmt) : 0;
  const cashUnder = isCash && lineAmt > 0 && paidAmt < lineAmt;

  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        borderRadius: "var(--radius-sm)",
        border: `1px solid ${cashUnder ? "#fecaca" : "var(--border)"}`,
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {/* Line header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-muted)",
            textTransform: "uppercase",
          }}
        >
          Baris {index + 1}
        </span>

        {/* Method selector */}
        <div style={{ display: "flex", gap: 4, flex: 1 }}>
          {METHODS.map((m) => (
            <button
              key={m}
              className={`payment-method-btn ${line.method === m ? "payment-method-btn--active" : ""}`}
              style={{ flex: 1, fontSize: 11, padding: "4px 6px" }}
              onClick={() => tender.setLineField(line.id, "method", m)}
            >
              {m}
            </button>
          ))}
        </div>

        {canRemove && (
          <button
            className="btn btn-ghost btn-sm"
            style={{ padding: "4px 6px", color: "#dc2626" }}
            onClick={() => tender.removeLine(line.id)}
            title="Hapus baris ini"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Amount input */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <label
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-muted)",
              display: "block",
              marginBottom: 3,
              textTransform: "uppercase",
            }}
          >
            Jumlah (Rp)
          </label>
          <input
            className="form-input"
            type="number"
            min={0}
            step="1000"
            placeholder="0"
            value={line.amount}
            onChange={(e) =>
              tender.setLineField(line.id, "amount", e.target.value)
            }
            style={{ fontSize: 14, fontWeight: 700, textAlign: "right" }}
          />
        </div>
        {tender.remaining > 0 && (
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 18, padding: "6px 8px", fontSize: 11 }}
            onClick={() => tender.fillRemaining(line.id)}
            title="Isi sisa"
          >
            <ChevronsRight size={13} /> Sisa
          </button>
        )}
      </div>

      {/* Cash paidAmount */}
      {isCash && lineAmt > 0 && (
        <div>
          <label
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-muted)",
              display: "block",
              marginBottom: 3,
              textTransform: "uppercase",
            }}
          >
            Uang Diterima (Rp)
          </label>
          <input
            className="form-input"
            type="number"
            min={0}
            step="1000"
            placeholder={`Kosong = cash pas Rp${fmt(lineAmt)}`}
            value={line.paidAmount}
            onChange={(e) =>
              tender.setLineField(line.id, "paidAmount", e.target.value)
            }
            style={{
              fontSize: 13,
              textAlign: "right",
              borderColor: cashUnder ? "#fca5a5" : undefined,
            }}
          />
          {cashUnder && (
            <div style={{ fontSize: 11, color: "#dc2626", marginTop: 3 }}>
              Kurang Rp{fmt(lineAmt - paidAmt)}
            </div>
          )}
          {lineChange > 0 && (
            <div
              style={{
                fontSize: 11,
                color: "var(--stock-ok)",
                marginTop: 3,
                fontWeight: 600,
              }}
            >
              Kembalian: Rp{fmt(lineChange)}
            </div>
          )}
        </div>
      )}

      {/* Non-cash reference */}
      {!isCash && (
        <div>
          <label
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-muted)",
              display: "block",
              marginBottom: 3,
              textTransform: "uppercase",
            }}
          >
            Referensi (opsional)
          </label>
          <input
            className="form-input"
            type="text"
            placeholder={`No. referensi ${line.method}…`}
            value={line.reference}
            onChange={(e) =>
              tender.setLineField(line.id, "reference", e.target.value)
            }
            style={{ fontSize: 12 }}
          />
        </div>
      )}
    </div>
  );
}
