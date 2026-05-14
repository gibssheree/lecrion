import { CreditCard } from "lucide-react";

interface Props {
  total: number;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}

function fmt(n: number): string {
  return new Intl.NumberFormat("id-ID").format(Math.round(n));
}

export default function PayButton({
  total,
  disabled,
  loading,
  onClick,
}: Props) {
  return (
    <button
      className="btn btn-primary btn-full btn-lg"
      disabled={disabled || loading}
      onClick={onClick}
      style={{ fontSize: 16, fontWeight: 700 }}
    >
      {loading ? (
        <>
          <div className="spinner" style={{ width: 18, height: 18 }} />{" "}
          Memproses…
        </>
      ) : (
        <>
          <CreditCard size={18} /> Bayar Rp{fmt(total)}
        </>
      )}
    </button>
  );
}
