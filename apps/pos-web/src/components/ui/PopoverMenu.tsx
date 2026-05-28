import { ReactNode, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  onClose: () => void;
  anchor: "right" | "left";
  width?: number;
  children: ReactNode;
  /** Optional ref to the trigger element to ignore clicks on it */
  triggerRef?: React.RefObject<HTMLElement | null>;
  className?: string;
}

/**
 * Generic floating dropdown panel anchored under the navbar.
 * Closes on click-outside and Escape.
 */
export default function PopoverMenu({
  open,
  onClose,
  anchor,
  width = 320,
  children,
  triggerRef,
  className,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef?.current?.contains(target)) return;
      onClose();
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose, triggerRef]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          className={`pos-popover ${className ?? ""}`.trim()}
          style={{
            width,
            [anchor]: 8,
          }}
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
          role="menu"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
