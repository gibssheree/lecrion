import { features } from "../../data/features";
import Section from "../layout/Section";
import FeatureCard from "../ui/FeatureCard";

export default function FeatureGridSection() {
  return (
    <Section id="features">
      <div className="lp-section-heading">
        <span>Fitur inti</span>
        <h2>Detail kecil yang bikin operasional tidak gampang bocor.</h2>
      </div>
      <div className="lp-feature-grid">
        {features.map((feature) => <FeatureCard key={feature.title} {...feature} />)}
      </div>
    </Section>
  );
}
