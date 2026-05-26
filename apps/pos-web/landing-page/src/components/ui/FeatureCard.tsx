import type { LucideIcon } from "lucide-react";

export default function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <article className="lp-feature-card">
      <Icon size={22} />
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
}
