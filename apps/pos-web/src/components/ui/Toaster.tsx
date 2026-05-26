import { AnimatePresence, motion } from "framer-motion";
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { useToastStore, ToastType } from "../../store/toast.store";

const STYLE: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
  success: { bg: "#f0fdf4", border: "#86efac", text: "#166534", icon: "#22c55e" },
  error:   { bg: "#fef2f2", border: "#fca5a5", text: "#991b1b", icon: "#ef4444" },
  info:    { bg: "#eff6ff", border: "#93c5fd", text: "#1e40af", icon: "#3b82f6" },
  warning: { bg: "#fffbeb", border: "#fcd34d", text: "#92400e", icon: "#f59e0b" },
};

const ICON: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={15} />,
  error:   <AlertCircle size={15} />,
  info:    <Info size={15} />,
  warning: <AlertTriangle size={15} />,
};

export default function Toaster() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div className="toaster-root">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const s = STYLE[t.type];
          return (
            <motion.div
              key={t.id}
              className="toast-item"
              style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text }}
              initial={{ opacity: 0, x: 48, scale: 0.95 }}
              animate={{ opacity: 1, x: 0,  scale: 1    }}
              exit={{    opacity: 0, x: 48, scale: 0.95 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              layout
            >
              <span className="toast-icon" style={{ color: s.icon }}>{ICON[t.type]}</span>
              <span className="toast-msg">{t.message}</span>
              <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Tutup">
                <X size={13} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
