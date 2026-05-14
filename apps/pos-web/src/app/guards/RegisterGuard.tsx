import RegisterGatePage from "../../features/register/RegisterGatePage";
import { useRegisterStore } from "../../store";

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
  const initialized = useRegisterStore((s) => s.initialized);

  // Still waiting for first fetch — show nothing to avoid wrong branch
  if (!initialized) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-base)",
        }}
      >
        <div className="spinner" style={{ width: 28, height: 28 }} />
      </div>
    );
  }

  // No active session → show open-register form
  if (status === "none") return <RegisterGatePage />;

  // Session active or suspended → go to kasir
  return <>{children}</>;
}
