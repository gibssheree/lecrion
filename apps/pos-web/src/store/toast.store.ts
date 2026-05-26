import { create } from "zustand";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastState {
  toasts: ToastItem[];
  /** Push a toast. duration=0 → persists until manually dismissed. Returns the toast ID. */
  push: (type: ToastType, message: string, duration?: number) => string;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (type, message, duration = 4000) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    if (duration > 0) {
      setTimeout(
        () => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
        duration,
      );
    }
    return id;
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function useToast() {
  const push    = useToastStore((s) => s.push);
  const dismiss = useToastStore((s) => s.dismiss);
  return {
    success:  (msg: string) => push("success", msg),
    error:    (msg: string) => push("error", msg),
    info:     (msg: string) => push("info", msg),
    warning:  (msg: string) => push("warning", msg),
    /** Persistent toast — stays until dismissed(id) is called. Returns toast ID. */
    persistent: (type: ToastType, msg: string) => push(type, msg, 0),
    dismiss,
  };
}
