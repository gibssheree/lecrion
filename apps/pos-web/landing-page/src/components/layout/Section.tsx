import type { ReactNode } from "react";

export default function Section({
  children,
  className = "",
  id,
  tone = "light",
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  tone?: "light" | "soft" | "dark";
}) {
  return (
    <section id={id} className={`lp-section lp-section--${tone} ${className}`.trim()}>
      <div className="lp-container">{children}</div>
    </section>
  );
}
