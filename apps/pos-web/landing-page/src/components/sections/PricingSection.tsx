import { pricingPlans } from "../../data/pricing";
import Section from "../layout/Section";
import PricingCard from "../ui/PricingCard";

export default function PricingSection() {
  return (
    <Section id="pricing" tone="soft">
      <div className="lp-section-heading">
        <span>Harga</span>
        <h2>Paket sederhana untuk mulai, lalu bisa naik saat outlet bertambah.</h2>
      </div>
      <div className="lp-pricing-grid">
        {pricingPlans.map((plan) => <PricingCard key={plan.name} plan={plan} />)}
      </div>
    </Section>
  );
}
