import { useEffect, useState } from "react";
import { useAuthStore } from "../store/auth.store";
import { useRegisterStore } from "../store/register.store";
import { OnlineStatusProvider } from "./OnlineStatusProvider";
import { getStoredPosToken } from "../services/api";

/**
 * AppProviders — bootstraps auth + register state before rendering anything.
 *
 * Phase 8: wraps with OnlineStatusProvider for offline mode support.
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
      await restore();
      const token = getStoredPosToken();
      if (token) {
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

  return <OnlineStatusProvider>{children}</OnlineStatusProvider>;
}
