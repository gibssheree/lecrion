import { Banknote, CookingPot, Store, Users } from "lucide-react";
import Section from "../layout/Section";

const lanes = [
  { icon: Store, label: "Front counter", text: "Kasir buka register" },
  { icon: CookingPot, label: "Kitchen display", text: "Dapur terima antrean" },
  { icon: Banknote, label: "Finance", text: "Cashflow otomatis masuk" },
  { icon: Users, label: "Owner", text: "Pantau outlet realtime" },
];

export default function RealtimeOpsSection() {
  return (
    <Section id="workflow" tone="dark">
      <div className="lp-section-heading">
        <span>Workflow</span>
        <h2>Dari chat pelanggan sampai laporan owner, alurnya nyambung.</h2>
      </div>
      <div className="lp-lane-grid">
        {lanes.map((lane) => {
          const Icon = lane.icon;
          return (
            <article className="lp-lane-card" key={lane.label}>
              <Icon size={24} />
              <span>{lane.label}</span>
              <strong>{lane.text}</strong>
            </article>
          );
        })}
      </div>
    </Section>
  );
}
