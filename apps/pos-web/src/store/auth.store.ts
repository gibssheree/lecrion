import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  clearSharedAuthToken,
  getMe,
  getStoredPosToken,
  login as apiLogin,
  setSharedAuthToken,
  setStoredRefreshToken,
} from "../services/api";
import { useSupportPreviewStore } from "./support-preview.store";

export interface AuthUser {
  actor: string;
  email: string;
  role: string;
  storeId: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string, loginMode?: string) => Promise<void>;
  logout: () => void;
  restore: () => Promise<void>;
  /** Convenience helpers for role checks */
  hasRole: (role: string | string[]) => boolean;
  isOwnerOrManager: () => boolean;
  isCashierOrAbove: () => boolean;
}

const ROLE_HIERARCHY: Record<string, number> = {
  owner: 100,
  manager: 80,
  cashier: 60,
  inventory_staff: 50,
  support: 40,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      login: async (email, password, loginMode) => {
        set({ isLoading: true, error: null });
        try {
          const res = await apiLogin(email, password, loginMode);
          setSharedAuthToken(res.accessToken);
          setStoredRefreshToken(res.refreshToken);
          set({
            token: res.accessToken,
            refreshToken: res.refreshToken,
            user: res.user,
            isLoading: false,
          });
          // A stale Support Preview flag from a previous session on this
          // browser must never carry into a new login — only a support-role
          // user is allowed to (re-)enable it, and only from the Support Console.
          if (res.user.role !== "support") {
            useSupportPreviewStore.getState().disablePreview();
          }
        } catch (err: unknown) {
          set({
            error: err instanceof Error ? err.message : "Login gagal",
            isLoading: false,
          });
          throw err;
        }
      },

      logout: () => {
        clearSharedAuthToken(); // also clears the refresh token — see services/api.ts
        useSupportPreviewStore.getState().disablePreview();
        set({ user: null, token: null, refreshToken: null });
      },

      restore: async () => {
        const token = getStoredPosToken() ?? get().token;
        if (!token) return;
        setSharedAuthToken(token);
        try {
          const user = await getMe();
          set({ token, user });
        } catch {
          clearSharedAuthToken();
          set({ user: null, token: null });
        }
      },

      hasRole: (role) => {
        const user = get().user;
        if (!user) return false;
        const roles = Array.isArray(role) ? role : [role];
        return roles.includes(user.role);
      },

      isOwnerOrManager: () => {
        const user = get().user;
        if (!user) return false;
        return ["owner", "manager"].includes(user.role);
      },

      isCashierOrAbove: () => {
        const user = get().user;
        if (!user) return false;
        return (ROLE_HIERARCHY[user.role] ?? 0) >= ROLE_HIERARCHY.cashier;
      },
    }),
    {
      name: "pos-auth",
      partialize: (s) => ({ token: s.token, refreshToken: s.refreshToken, user: s.user }),
    },
  ),
);
