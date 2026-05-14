import { useState } from "react";
import { PauseCircle, PlayCircle } from "lucide-react";
import { useRegisterStore } from "../../store/register.store";
import { suspendRegister, resumeRegister } from "../../services/api";

export default function SuspendResumeButton() {
  const [loading, setLoading] = useState(false);
  const session = useRegisterStore((s) => s.session);
  const status = useRegisterStore((s) => s.status);
  const refresh = useRegisterStore((s) => s.refresh);

  if (!session) return null;

  async function handleToggle() {
    if (!session) return;
    setLoading(true);
    try {
      if (status === "open") {
        await suspendRegister(session.id);
      } else if (status === "suspended") {
        await resumeRegister(session.id);
      }
      await refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal");
    } finally {
      setLoading(false);
    }
  }

  if (status === "open") {
    return (
      <button
        className="btn btn-ghost btn-sm"
        onClick={handleToggle}
        disabled={loading}
        style={{ display: "flex", alignItems: "center", gap: 5 }}
      >
        <PauseCircle size={14} /> {loading ? "…" : "Suspend"}
      </button>
    );
  }

  if (status === "suspended") {
    return (
      <button
        className="btn btn-primary btn-sm"
        onClick={handleToggle}
        disabled={loading}
        style={{ display: "flex", alignItems: "center", gap: 5 }}
      >
        <PlayCircle size={14} /> {loading ? "…" : "Resume"}
      </button>
    );
  }

  return null;
}
