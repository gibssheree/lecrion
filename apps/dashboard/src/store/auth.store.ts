import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  createElement,
} from "react";
import { getStoredToken, login, logout, getMe } from "../services/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthState {
  /** null = still checking, false = not authed, true = authed */
  authed: boolean | null;
  userEmail: string;
  loginError: string | null;
  loginLoading: boolean;
  handleLogin: (email: string, password: string) => Promise<void>;
  handleLogout: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider — manages session state for the entire dashboard.
 *
 * Owns:
 *   - Token validation on mount (getMe check)
 *   - Login / logout actions
 *   - userEmail and authed flag
 *
 * Consumed via useAuth() hook anywhere in the tree.
 * Eliminates prop-drilling of userEmail/onLogout through AppRoutes → DashboardShell → Sidebar.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Validate stored token on mount
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setAuthed(false);
      return;
    }
    getMe()
      .then((me) => {
        setUserEmail(me.email ?? "");
        setAuthed(true);
      })
      .catch(() => setAuthed(false));
  }, []);

  async function handleLogin(email: string, password: string) {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const result = await login({ email, password });
      setUserEmail(result.user.email);
      setAuthed(true);
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    setAuthed(false);
    setUserEmail("");
  }

  return createElement(
    AuthContext.Provider,
    {
      value: {
        authed,
        userEmail,
        loginError,
        loginLoading,
        handleLogin,
        handleLogout,
      },
    },
    children,
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useAuth — access auth state from any component in the tree.
 *
 * Must be used inside <AuthProvider>.
 */
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
