interface Props {
  total: number;
  received: string;
  onChange: (v: string) => void;
}

function fmt(n: number): string {
  return new Intl.NumberFormat("id-ID").format(Math.round(n));
}

// Generate quick-cash preset buttons based on total
function getPresets(total: number): number[] {
  const base = [5000, 10000, 20000, 50000, 100000, 200000];
  // Always include exact amount and next round-up
  const roundUp = Math.ceil(total / 10000) * 10000;
  const all = Array.from(new Set([...base, roundUp, total])).sort(
    (a, b) => a - b,
  );
  // Only show amounts >= total, max 5 buttons
  return all.filter((v) => v >= total).slice(0, 5);
}

export default function CashInput({ total, received, onChange }: Props) {
  const receivedNum = Number(received) || 0;
  const change = receivedNum - total;
  const presets = getPresets(total);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Quick cash presets */}
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-muted)",
            marginBottom: 6,
          }}
        >
          NOMINAL CEPAT
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange(String(p))}
              style={{
                padding: "5px 10px",
                borderRadius: "var(--radius-sm)",
                border: `1px solid ${receivedNum === p ? "var(--primary)" : "var(--border)"}`,
                background:
                  receivedNum === p
                    ? "var(--primary-light)"
                    : "var(--bg-elevated)",
                color:
                  receivedNum === p
                    ? "var(--primary)"
                    : "var(--text-secondary)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.1s",
              }}
            >
              {p === total ? "PAS" : `Rp${fmt(p)}`}
            </button>
          ))}
        </div>
      </div>

      {/* Manual input */}
      <div>
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-muted)",
            display: "block",
            marginBottom: 6,
          }}
        >
          UANG DITERIMA (Rp)
        </label>
        <input
          className="form-input"
          type="number"
          min={total}
          step="1000"
          placeholder={String(total)}
          value={received}
          onChange={(e) => onChange(e.target.value)}
          style={{ fontSize: 18, fontWeight: 700, textAlign: "right" }}
          autoFocus
        />
      </div>

      {/* Change display */}
      {receivedNum > 0 && (
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
            Rp{fmt(Math.max(0, change))}
          </div>
          {change < 0 && (
            <div
              style={{ fontSize: 12, color: "var(--stock-out)", marginTop: 2 }}
            >
              Kurang Rp{fmt(Math.abs(change))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
