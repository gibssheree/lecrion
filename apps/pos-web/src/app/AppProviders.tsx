import { useEffect, useState } from "react";
import { useAuthStore } from "../store/auth.store";
import { useRegisterStore } from "../store/register.store";

/**
 * AppProviders — bootstraps auth + register state before rendering anything.
 *
 * Sequence:
 *   1. restore() — rehydrate token from localStorage, validate with /api/auth/me
 *   2. if token valid → refresh() — fetch active register session
 *   3. only then render children
 *
 * This prevents RegisterGuard from seeing stale "none" status.
 */
export default function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const restore = useAuthStore((s) => s.restore);
  const refresh = useRegisterStore((s) => s.refresh);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function boot() {
      // 1. restore auth (validates token with /api/auth/me)
      await restore();

      // 2. check if we now have a valid token
      const token = sessionStorage.getItem("pos_token");
      if (token) {
        // 3. fetch active register session before rendering
        await refresh();
      }

      setReady(true);
    }

    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-base, #0f172a)",
        }}
      >
        <div className="spinner" style={{ width: 28, height: 28 }} />
      </div>
    );
  }

  return <>{children}</>;
}
