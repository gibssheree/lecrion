import React, { HTMLAttributes } from "react";
import "./GlassPanel.css";

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  dark?: boolean;
  hoverable?: boolean;
  glow?: boolean;
}

export default function GlassPanel({
  children,
  className = "",
  dark = false,
  hoverable = false,
  glow = false,
  ...props
}: GlassPanelProps) {
  const classes = [
    "glass-panel",
    dark ? "glass-panel-dark" : "",
    hoverable ? "glass-panel-hoverable" : "",
    glow ? "glass-panel-glow" : "",
    className
  ].filter(Boolean).join(" ");

  return (
    <div className={classes} {...props}>
      <div className="glass-panel-content">
        {children}
      </div>
    </div>
  );
}
