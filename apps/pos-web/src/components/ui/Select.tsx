import React, {
  ReactNode,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import "./Form.css";
import "./Select.css";

/** Minimal change-event shape so existing `(e) => setX(e.target.value)` call sites keep working. */
export interface SelectChangeEvent {
  target: { value: string; name?: string };
}

export interface SelectProps
  extends Omit<
    React.SelectHTMLAttributes<HTMLSelectElement>,
    "onChange" | "value" | "defaultValue" | "size" | "onClick" | "onKeyDown"
  > {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (event: SelectChangeEvent) => void;
  size?: "sm" | "md";
  /** <option> elements — same API as a native select for minimal call-site changes. */
  children?: ReactNode;
}

interface Option {
  value: string;
  label: ReactNode;
  searchText: string;
  disabled: boolean;
}

function extractOptions(children: ReactNode): Option[] {
  const options: Option[] = [];
  React.Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const props = child.props as {
      value?: string;
      disabled?: boolean;
      children?: ReactNode;
    };
    const value = props.value != null ? String(props.value) : "";
    const label = props.children ?? value;
    options.push({
      value,
      label,
      searchText: typeof label === "string" ? label.toLowerCase() : value.toLowerCase(),
      disabled: !!props.disabled,
    });
  });
  return options;
}

const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      label,
      error,
      leftIcon,
      placeholder = "Pilih...",
      className = "",
      id,
      children,
      value,
      defaultValue,
      onChange,
      disabled,
      name,
      size = "md",
      style,
      ...rest
    },
    ref,
  ) => {
    const options = useMemo(() => extractOptions(children), [children]);
    const isControlled = value !== undefined;
    const [innerValue, setInnerValue] = useState(defaultValue ?? "");
    const currentValue = isControlled ? value : innerValue;

    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [rect, setRect] = useState<{ top: number; left: number; width: number; openUp: boolean } | null>(null);

    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const typeaheadRef = useRef("");
    const typeaheadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const selectId = id || (label ? `select-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
    const selected = options.find((o) => o.value === currentValue);

    const updatePosition = useCallback(() => {
      const el = triggerRef.current;
      if (!el) return;
      const box = el.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const spaceBelow = viewportH - box.bottom;
      const openUp = spaceBelow < 260 && box.top > spaceBelow;
      setRect({ top: openUp ? box.top : box.bottom, left: box.left, width: box.width, openUp });
    }, []);

    const close = useCallback(() => {
      setOpen(false);
      setActiveIndex(-1);
    }, []);

    const commit = useCallback(
      (val: string) => {
        if (!isControlled) setInnerValue(val);
        onChange?.({ target: { value: val, name } });
      },
      [isControlled, name, onChange],
    );

    const openPanel = useCallback(() => {
      if (disabled) return;
      updatePosition();
      const idx = options.findIndex((o) => o.value === currentValue);
      setActiveIndex(idx >= 0 ? idx : options.findIndex((o) => !o.disabled));
      setOpen(true);
    }, [disabled, options, currentValue, updatePosition]);

    useEffect(() => {
      if (!open) return;
      function onDocMouseDown(e: MouseEvent) {
        const t = e.target as Node;
        if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
        close();
      }
      function onScrollOrResize() {
        updatePosition();
      }
      document.addEventListener("mousedown", onDocMouseDown);
      window.addEventListener("scroll", onScrollOrResize, true);
      window.addEventListener("resize", onScrollOrResize);
      return () => {
        document.removeEventListener("mousedown", onDocMouseDown);
        window.removeEventListener("scroll", onScrollOrResize, true);
        window.removeEventListener("resize", onScrollOrResize);
      };
    }, [open, close, updatePosition]);

    useLayoutEffect(() => {
      if (open && activeIndex >= 0) {
        panelRef.current
          ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
          ?.scrollIntoView({ block: "nearest" });
      }
    }, [open, activeIndex]);

    const jumpToTypeahead = useCallback(
      (char: string) => {
        if (typeaheadTimer.current) clearTimeout(typeaheadTimer.current);
        typeaheadRef.current += char.toLowerCase();
        const query = typeaheadRef.current;
        typeaheadTimer.current = setTimeout(() => (typeaheadRef.current = ""), 600);
        const idx = options.findIndex((o) => !o.disabled && o.searchText.startsWith(query));
        if (idx >= 0) {
          setActiveIndex(idx);
          if (!open) commit(options[idx].value);
        }
      },
      [options, open, commit],
    );

    function handleTriggerKeyDown(e: React.KeyboardEvent) {
      if (disabled) return;
      if (!open) {
        if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
          e.preventDefault();
          openPanel();
          return;
        }
        if (e.key.length === 1 && /[a-z0-9]/i.test(e.key)) {
          jumpToTypeahead(e.key);
        }
        return;
      }
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          close();
          break;
        case "ArrowDown": {
          e.preventDefault();
          let next = activeIndex;
          do next = (next + 1) % options.length; while (options[next]?.disabled && next !== activeIndex);
          setActiveIndex(next);
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          let prev = activeIndex;
          do prev = (prev - 1 + options.length) % options.length; while (options[prev]?.disabled && prev !== activeIndex);
          setActiveIndex(prev);
          break;
        }
        case "Home":
          e.preventDefault();
          setActiveIndex(options.findIndex((o) => !o.disabled));
          break;
        case "End":
          e.preventDefault();
          for (let i = options.length - 1; i >= 0; i--) {
            if (!options[i].disabled) {
              setActiveIndex(i);
              break;
            }
          }
          break;
        case "Enter":
        case "Tab":
          if (activeIndex >= 0 && options[activeIndex] && !options[activeIndex].disabled) {
            e.preventDefault();
            commit(options[activeIndex].value);
          }
          close();
          break;
        default:
          if (e.key.length === 1 && /[a-z0-9]/i.test(e.key)) jumpToTypeahead(e.key);
      }
    }

    const sizeClass = size === "sm" ? "select-trigger--sm" : "";

    return (
      <div className={`form-group ${className}`}>
        {label && (
          <label htmlFor={selectId} className="form-label">
            {label}
          </label>
        )}
        <div className="form-input-wrapper">
          {leftIcon && <span className="form-icon-left">{leftIcon}</span>}
          <button
            type="button"
            id={selectId}
            ref={(node) => {
              (triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
              if (typeof ref === "function") ref(node);
              else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
            }}
            className={`form-control select-trigger ${sizeClass} ${leftIcon ? "has-icon-left" : ""} ${
              error ? "is-invalid" : ""
            } ${open ? "select-trigger--open" : ""}`}
            style={style}
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            role="combobox"
            onClick={() => (open ? close() : openPanel())}
            onKeyDown={handleTriggerKeyDown}
            {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
          >
            <span className={`select-trigger-label ${!selected ? "select-trigger-label--placeholder" : ""}`}>
              {selected ? selected.label : placeholder}
            </span>
          </button>
          <span className="form-icon-right select-chevron" aria-hidden="true">
            <ChevronDown size={16} />
          </span>
        </div>
        {error && <span className="form-error animate-slide-up">{error}</span>}

        {typeof document !== "undefined" &&
          createPortal(
            <AnimatePresence>
              {open && rect && (
                <motion.div
                  ref={panelRef}
                  role="listbox"
                  className="select-panel"
                  style={{
                    position: "fixed",
                    left: rect.left,
                    top: rect.openUp ? undefined : rect.top + 6,
                    bottom: rect.openUp ? window.innerHeight - rect.top + 6 : undefined,
                    width: rect.width,
                  }}
                  initial={{ opacity: 0, y: rect.openUp ? 4 : -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: rect.openUp ? 4 : -4, scale: 0.98 }}
                  transition={{ duration: 0.13, ease: [0.16, 1, 0.3, 1] }}
                >
                  {options.length === 0 && <div className="select-empty">Tidak ada opsi</div>}
                  {options.map((opt, idx) => (
                    <div
                      key={`${opt.value}-${idx}`}
                      data-index={idx}
                      role="option"
                      aria-selected={opt.value === currentValue}
                      className={`select-option ${idx === activeIndex ? "select-option--active" : ""} ${
                        opt.value === currentValue ? "select-option--selected" : ""
                      } ${opt.disabled ? "select-option--disabled" : ""}`}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        if (opt.disabled) return;
                        commit(opt.value);
                        close();
                        triggerRef.current?.focus();
                      }}
                    >
                      <span className="select-option-label">{opt.label}</span>
                      {opt.value === currentValue && (
                        <Check size={14} className="select-option-check" />
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>,
            document.body,
          )}
      </div>
    );
  },
);

Select.displayName = "Select";
export default Select;
