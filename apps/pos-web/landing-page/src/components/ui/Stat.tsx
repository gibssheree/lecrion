export default function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="lp-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
