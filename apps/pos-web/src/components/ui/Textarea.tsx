import React, { TextareaHTMLAttributes, forwardRef } from "react";
import "./Form.css";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = "", id, rows = 3, ...props }, ref) => {
    const textareaId = id || (label ? `textarea-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);

    return (
      <div className={`form-group ${className}`}>
        {label && (
          <label htmlFor={textareaId} className="form-label">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          className={`form-control form-textarea ${error ? "is-invalid" : ""}`}
          {...props}
        />
        {error && <span className="form-error animate-slide-up">{error}</span>}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";
export default Textarea;
