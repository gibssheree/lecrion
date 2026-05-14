const METHODS = ["Cash", "Transfer", "QRIS"];

interface Props {
  value: string;
  onChange: (method: string) => void;
}

export default function PaymentMethodSelector({ value, onChange }: Props) {
  return (
    <div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-muted)",
          marginBottom: 8,
        }}
      >
        METODE BAYAR
      </div>
      <div className="payment-methods">
        {METHODS.map((m) => (
          <button
            key={m}
            className={`payment-method-btn ${value === m ? "payment-method-btn--active" : ""}`}
            onClick={() => onChange(m)}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}
