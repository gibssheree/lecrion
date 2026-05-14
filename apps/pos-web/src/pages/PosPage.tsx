import PosShell from "../components/layout/PosShell";
import { useRealtimeSync } from "../hooks/useRealtimeSync";

export default function PosPage() {
  // Subscribe to realtime events (order updates, stock alerts)
  useRealtimeSync();
  return <PosShell />;
}
