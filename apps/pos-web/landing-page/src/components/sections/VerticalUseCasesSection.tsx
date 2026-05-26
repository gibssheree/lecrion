import { verticals } from "../../data/verticals";
import Section from "../layout/Section";

export default function VerticalUseCasesSection() {
  return (
    <Section tone="soft">
      <div className="lp-section-heading">
        <span>Use case</span>
        <h2>Cocok untuk bisnis yang butuh transaksi dan kontrol outlet.</h2>
      </div>
      <div className="lp-vertical-grid">
        {verticals.map((vertical) => (
          <article className="lp-vertical-card" key={vertical.title}>
            <h3>{vertical.title}</h3>
            <p>{vertical.description}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}
