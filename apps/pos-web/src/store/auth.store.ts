import { create } from "zustand";
import { persist } from "zustand/middleware";
import { login as apiLogin, getMe } from "../services/api";

interface AuthUser {
  actor: string;
  email: string;
  role: string;
  storeId: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  restore: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await apiLogin(email, password);
          sessionStorage.setItem("pos_token", res.accessToken);
          set({ token: res.accessToken, user: res.user, isLoading: false });
        } catch (err: unknown) {
          set({
            error: err instanceof Error ? err.message : "Login gagal",
            isLoading: false,
          });
          throw err;
        }
      },

      logout: () => {
        sessionStorage.removeItem("pos_token");
        set({ user: null, token: null });
      },

      restore: async () => {
        const token = sessionStorage.getItem("pos_token");
        if (!token) return;
        try {
          const user = await getMe();
          set({ token, user });
        } catch {
          sessionStorage.removeItem("pos_token");
          set({ user: null, token: null });
        }
      },
    }),
    { name: "pos-auth", partialize: (s) => ({ token: s.token, user: s.user }) },
  ),
);
