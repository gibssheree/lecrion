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
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          background: "#f8fafc",
        }}
      >
        <img src="/Lecrion.png" alt="Lecrion" style={{ height: 30, width: "auto", opacity: 0.9 }} />
        <div className="spinner" style={{ width: 20, height: 20 }} />
      </div>
    );
  }

  return <OnlineStatusProvider>{children}</OnlineStatusProvider>;
}
