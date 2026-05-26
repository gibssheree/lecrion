/** Format number as Indonesian Rupiah integer (no symbol) */
export function fmt(n: number | null | undefined): string {
  return new Intl.NumberFormat("id-ID").format(Math.round(Number(n ?? 0)));
}

/** Format percentage to 1 decimal */
export function fmtPct(n: number): string {
  return `${Number(n).toFixed(1)}%`;
}

/** Format date as Indonesian locale string */
export function fmtDate(
  date: string | Date,
  opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" },
): string {
  return new Date(date).toLocaleDateString("id-ID", opts);
}

/** Format datetime as short Indonesian locale string */
export function fmtDateTime(date: string | Date): string {
  return new Date(date).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
