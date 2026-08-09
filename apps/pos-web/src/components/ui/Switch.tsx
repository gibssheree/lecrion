import { CSSProperties, InputHTMLAttributes, ReactNode, forwardRef } from "react";
import "./Controls.css";

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "style"> {
  label?: ReactNode;
  /** Applied to the wrapper <label>, since the native input is visually hidden. */
  style?: CSSProperties;
}

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, className = "", disabled, id, style, ...props }, ref) => {
    return (
      <label
        htmlFor={id}
        className={`ctl-row ${disabled ? "ctl-row--disabled" : ""} ${className}`}
        style={style}
      >
        <input id={id} type="checkbox" className="ctl-native" disabled={disabled} ref={ref} {...props} />
        <span className="switch-track">
          <span className="switch-thumb" />
        </span>
        {label && <span className="ctl-label">{label}</span>}
      </label>
    );
  },
);

Switch.displayName = "Switch";
export default Switch;
