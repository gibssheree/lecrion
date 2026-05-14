import { create } from "zustand";
import { getActiveRegister } from "../services/api";

interface RegisterSession {
  id: number;
  store_id: string;
  cashier_id: string;
  status: "open" | "suspended" | "closed";
  opening_cash: number;
  opened_at: string;
}

interface RegisterState {
  session: RegisterSession | null;
  status: "open" | "suspended" | "closed" | "none";
  isLoading: boolean;
  /** false until the first refresh() has completed */
  initialized: boolean;
  refresh: () => Promise<void>;
  setSession: (session: RegisterSession | null) => void;
}

export const useRegisterStore = create<RegisterState>((set) => ({
  session: null,
  status: "none",
  isLoading: true, // start true so guards wait for first fetch
  initialized: false,

  refresh: async () => {
    set({ isLoading: true });
    try {
      // getActiveRegister wraps response as { session: ... | null }
      const res = await getActiveRegister();
      const session: RegisterSession | null = res?.session ?? null;
      set({
        session,
        status: session
          ? (session.status as "open" | "suspended" | "closed")
          : "none",
        isLoading: false,
        initialized: true,
      });
    } catch {
      set({
        session: null,
        status: "none",
        isLoading: false,
        initialized: true,
      });
    }
  },

  setSession: (session) => {
    set({
      session,
      status: session
        ? (session.status as "open" | "suspended" | "closed")
        : "none",
    });
  },
}));
