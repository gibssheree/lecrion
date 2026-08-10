import type { ReactNode } from "react";
import { useReveal } from "../../hooks/useReveal";

export default function Section({
  children,
  className = "",
  id,
  tone = "light",
  wide = false,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  tone?: "light" | "paper" | "dark";
  wide?: boolean;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();

  return (
    <section id={id} className={`lp-section lp-section--${tone} ${className}`.trim()}>
      <div
        ref={ref}
        className={`lp-container${wide ? " lp-container--wide" : ""} lp-reveal${
          visible ? " is-visible" : ""
        }`}
      >
        {children}
      </div>
    </section>
  );
}
