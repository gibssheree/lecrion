import React, { SelectHTMLAttributes, ReactNode, forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import "./Form.css";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, leftIcon, className = "", id, children, ...props }, ref) => {
    const selectId = id || (label ? `select-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
    
    return (
      <div className={`form-group ${className}`}>
        {label && (
          <label htmlFor={selectId} className="form-label">
            {label}
          </label>
        )}
        <div className="form-input-wrapper">
          {leftIcon && <span className="form-icon-left">{leftIcon}</span>}
          <select
            id={selectId}
            ref={ref}
            className={`form-control ${leftIcon ? "has-icon-left" : ""} ${error ? "is-invalid" : ""}`}
            style={{ appearance: "none", paddingRight: "2.5rem" }}
            {...props}
          >
            {children}
          </select>
          <span className="form-icon-right" style={{ pointerEvents: "none" }}>
            <ChevronDown size={16} />
          </span>
        </div>
        {error && <span className="form-error animate-slide-up">{error}</span>}
      </div>
    );
  }
);

Select.displayName = "Select";
export default Select;
