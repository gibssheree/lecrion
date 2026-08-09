import React, { InputHTMLAttributes, ReactNode, forwardRef, useEffect, useRef } from "react";
import { Check, Minus } from "lucide-react";
import "./Controls.css";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "style"> {
  label?: ReactNode;
  /** Visually shows a dash instead of a check — does not affect `checked`. */
  indeterminate?: boolean;
  /** Applied to the wrapper <label>, since the native input is visually hidden. */
  style?: React.CSSProperties;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, indeterminate = false, className = "", disabled, id, style, ...props }, ref) => {
    const innerRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (innerRef.current) innerRef.current.indeterminate = indeterminate;
    }, [indeterminate]);

    return (
      <label
        htmlFor={id}
        className={`ctl-row ${disabled ? "ctl-row--disabled" : ""} ${className}`}
        style={style}
      >
        <input
          id={id}
          type="checkbox"
          className="ctl-native"
          disabled={disabled}
          ref={(node) => {
            (innerRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
          }}
          {...props}
        />
        <span className={`checkbox-box ${indeterminate ? "checkbox-box--indeterminate" : ""}`}>
          {indeterminate ? <Minus size={12} strokeWidth={3} /> : <Check size={12} strokeWidth={3} />}
        </span>
        {label && <span className="ctl-label">{label}</span>}
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";
export default Checkbox;
