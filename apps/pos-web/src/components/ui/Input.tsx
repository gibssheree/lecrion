import React, { InputHTMLAttributes, ReactNode, forwardRef } from "react";
import "./Form.css";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, className = "", id, ...props }, ref) => {
    const inputId = id || (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
    
    return (
      <div className={`form-group ${className}`}>
        {label && (
          <label htmlFor={inputId} className="form-label">
            {label}
          </label>
        )}
        <div className="form-input-wrapper">
          {leftIcon && <span className="form-icon-left">{leftIcon}</span>}
          <input
            id={inputId}
            ref={ref}
            className={`form-control ${leftIcon ? "has-icon-left" : ""} ${
              rightIcon ? "has-icon-right" : ""
            } ${error ? "is-invalid" : ""}`}
            {...props}
          />
          {rightIcon && <span className="form-icon-right">{rightIcon}</span>}
        </div>
        {error && <span className="form-error animate-slide-up">{error}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
