import type { ReactNode } from "react";
import { useReveal } from "../../hooks/useReveal";

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
  const { ref, visible } = useReveal<HTMLDivElement>();

  return (
    <section id={id} className={`lp-section lp-section--${tone} ${className}`.trim()}>
      <div
        ref={ref}
        className={`lp-container lp-reveal${visible ? " is-visible" : ""}`}
      >
        {children}
      </div>
    </section>
  );
}
