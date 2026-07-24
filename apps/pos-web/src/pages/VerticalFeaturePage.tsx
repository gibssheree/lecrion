import {
  Boxes,
  CalendarDays,
  ClipboardList,
  PackageSearch,
  Wrench,
} from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";

interface Props {
  title: string;
  domain: "sales" | "products" | "inventory" | "reports";
  description: string;
  checkpoints: string[];
}

const domainIcon = {
  sales: <CalendarDays size={18} />,
  products: <Boxes size={18} />,
  inventory: <PackageSearch size={18} />,
  reports: <ClipboardList size={18} />,
} as const;

export default function VerticalFeaturePage({
  title,
  domain,
  description,
  checkpoints,
}: Props) {
  return (
    <PosAppShell title={title}>
      <section className="summary-grid" style={{ gridTemplateColumns: "1fr" }}>
        <div className="summary-card">
          <div className="summary-card-label">
            {domainIcon[domain]} Modul Vertical
          </div>
          <div className="summary-card-value" style={{ fontSize: 22 }}>
            {title}
          </div>
          <div className="summary-card-sub" style={{ maxWidth: 760 }}>
            {description}
          </div>
        </div>
      </section>

      <section
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 18px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Wrench size={16} color="var(--primary)" />
          <strong style={{ fontSize: 14 }}>Ruang kerja awal</strong>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            padding: 16,
          }}
        >
          {checkpoints.map((item) => (
            <div
              key={item}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: 14,
                background: "var(--bg-base)",
                color: "var(--text-secondary)",
                fontSize: 13,
                fontWeight: 650,
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </section>
    </PosAppShell>
  );
}
