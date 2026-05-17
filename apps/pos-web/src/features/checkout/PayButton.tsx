import { CreditCard } from "lucide-react";

interface Props {
  total: number;
  method?: string;
  paidAmount?: number;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}

function fmt(n: number): string {
  return new Intl.NumberFormat("id-ID").format(Math.round(n));
}

export default function PayButton({
  total,
  method = "",
  paidAmount,
  disabled,
  loading,
  onClick,
}: Props) {
  const isCash = method.toLowerCase() === "cash";
  const isSplit = method.toLowerCase() === "split";
  const change =
    isCash && typeof paidAmount === "number"
      ? Math.max(paidAmount - total, 0)
      : 0;

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
          <CreditCard size={18} />{" "}
          {isSplit ? "Bayar Split" : isCash ? "Bayar Cash" : "Bayar"} Rp
          {fmt(total)}
          {isCash && change > 0 ? ` • Kembali Rp${fmt(change)}` : ""}
        </>
      )}
    </button>
  );
}
