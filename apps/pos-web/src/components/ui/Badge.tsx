import { HTMLAttributes, ReactNode } from "react";
import "./Badge.css";

export type BadgeVariant = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
  children: ReactNode;
}

export default function Badge({ variant = "neutral", dot = false, className = "", children, ...props }: BadgeProps) {
  return (
    <span className={`ui-badge ui-badge--${variant} ${className}`} {...props}>
      {dot && <span className="ui-badge-dot" />}
      {children}
    </span>
  );
}
