import { CSSProperties, InputHTMLAttributes, ReactNode, forwardRef } from "react";
import "./Controls.css";

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "style"> {
  label?: ReactNode;
  /** Applied to the wrapper <label>, since the native input is visually hidden. */
  style?: CSSProperties;
}

const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, className = "", disabled, id, style, ...props }, ref) => {
    return (
      <label
        htmlFor={id}
        className={`ctl-row ${disabled ? "ctl-row--disabled" : ""} ${className}`}
        style={style}
      >
        <input id={id} type="radio" className="ctl-native" disabled={disabled} ref={ref} {...props} />
        <span className="radio-dot" />
        {label && <span className="ctl-label">{label}</span>}
      </label>
    );
  },
);

Radio.displayName = "Radio";
export default Radio;
