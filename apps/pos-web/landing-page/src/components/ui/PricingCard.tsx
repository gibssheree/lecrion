import { CheckCircle2 } from "lucide-react";
import Button from "./Button";

export default function PricingCard({
  plan,
}: {
  plan: {
    name: string;
    price: string;
    description: string;
    features: string[];
    featured?: boolean;
  };
}) {
  return (
    <article className={`lp-pricing-card ${plan.featured ? "is-featured" : ""}`}>
      {plan.featured ? <span className="lp-pricing-flag">Paling pas</span> : null}
      <h3>{plan.name}</h3>
      <p>{plan.description}</p>
      <strong className="lp-price">{plan.price}</strong>
      <ul>
        {plan.features.map((feature) => (
          <li key={feature}>
            <CheckCircle2 size={16} />
            {feature}
          </li>
        ))}
      </ul>
      <Button href="#contact" variant={plan.featured ? "primary" : "secondary"}>
        Pilih paket
      </Button>
    </article>
  );
}
