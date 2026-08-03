import * as React from "react";
import RegisterGatePage from "../../features/register/RegisterGatePage";
import { useRegisterStore } from "../../store";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "../../components/ui/Skeleton";

/**
 * RegisterGuard — protects the POS kasir screen.
 *
 * Waits for the first register refresh to complete before deciding:
 *   - not initialized yet  → show spinner (avoid flash of open-register form)
 *   - status "none"        → show RegisterGatePage (open session form)
 *   - status "open" / "suspended" → render children (PosPage)
 */
export default function RegisterGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const status = useRegisterStore((s) => s.status);
  const session = useRegisterStore((s) => s.session);
  const initialized = useRegisterStore((s) => s.initialized);
  const refresh = useRegisterStore((s) => s.refresh);
  const navigate = useNavigate();
  const [timeoutReached, setTimeoutReached] = React.useState(false);

  React.useEffect(() => {
    if (!initialized) {
      refresh();
      // Fail-safe in case refresh hangs
      const timer = setTimeout(() => setTimeoutReached(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [initialized, refresh]);

  // Still waiting for first fetch — skeleton prevents flash of wrong branch.
  if (!initialized && !timeoutReached) {
    return (
      <div className="pos-shell">
        {/* Topbar skeleton */}
        <div className="topbar">
          <Skeleton style={{ height: 20, width: 120 }} />
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <Skeleton style={{ height: 32, width: 32, borderRadius: "50%" }} />
            <Skeleton style={{ height: 32, width: 80 }} />
          </div>
        </div>
        {/* Main area skeleton */}
        <div className="pos-main">
          <div className="panel" style={{ padding: 12, gap: 8, display: "flex", flexDirection: "column" }}>
            <Skeleton style={{ height: 40, width: "100%" }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} style={{ height: 100, borderRadius: 10 }} />
              ))}
            </div>
          </div>
          <div className="panel" />
          <div className="panel" />
        </div>
        {/* Bottombar skeleton */}
        <div className="bottombar">
          <Skeleton style={{ height: 12, width: 120 }} />
        </div>
      </div>
    );
  }

  // No active session → show open-register form
  if (status === "none" || !session?.id)
    return <RegisterGatePage onCancel={() => navigate("/dashboard", { replace: true })} />;

  // Session active or suspended → go to kasir
  return <>{children}</>;
}
