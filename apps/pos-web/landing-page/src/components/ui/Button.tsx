import type { AnchorHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
}

export default function Button({ children, className = "", variant = "primary", ...props }: ButtonProps) {
  return (
    <a className={`lp-button lp-button--${variant} ${className}`.trim()} {...props}>
      {children}
    </a>
  );
}
