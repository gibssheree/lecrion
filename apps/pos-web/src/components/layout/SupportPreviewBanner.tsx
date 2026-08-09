// apps/pos-web/src/components/layout/SupportPreviewBanner.tsx
import { useNavigate } from "react-router-dom";
import { ShieldAlert, X, Eye, ChevronDown } from "lucide-react";
import {
  SUPPORT_VERTICALS,
  useSupportPreviewStore,
} from "../../store/support-preview.store";
import { useToast } from "../../store/toast.store";
import { usePermissions } from "../../hooks/usePermissions";
import Select from "../ui/Select";

export default function SupportPreviewBanner() {
  const navigate = useNavigate();
  const toast = useToast();
  const { isSupport } = usePermissions();
  const isPreviewActive = useSupportPreviewStore((s) => s.isPreviewActive);
  const activeVerticalKey = useSupportPreviewStore((s) => s.activeVerticalKey);
  const enablePreview = useSupportPreviewStore((s) => s.enablePreview);
  const disablePreview = useSupportPreviewStore((s) => s.disablePreview);

  // Preview mode is a support-only affordance. The flag is persisted in
  // localStorage (not scoped to a session), so a stale value must never be
  // trusted for anyone but an actual support-role user — otherwise it leaks
  // into real owner/manager/cashier logins on the same browser.
  if (!isSupport || !isPreviewActive) return null;

  const currentVert =
    SUPPORT_VERTICALS.find((v) => v.key === activeVerticalKey) ??
    SUPPORT_VERTICALS[0];

  function handleSwitch(key: string) {
    enablePreview(key);
    const vert = SUPPORT_VERTICALS.find((v) => v.key === key);
    toast.success(`Mode Support Preview disetel ke: ${vert?.name ?? key}`);

    // Navigate to primary route for that vertical so they don't stay on the Support Dashboard
    if (key === "restaurant_cafe") {
      navigate("/sales/tables");
    } else if (key === "construction_materials") {
      navigate("/sales/delivery-schedule");
    } else if (key === "accommodation_hotel") {
      navigate("/sales/reservations");
    } else if (key === "retail") {
      navigate("/products/barcodes");
    } else {
      navigate("/dashboard");
    }
  }

  function handleExit() {
    disablePreview();
    toast.info("Keluar dari Mode Support Preview — kembali ke Support Console");
    navigate("/support");
  }

  return (
    <div
      style={{
        background: "linear-gradient(90deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
        color: "#ffffff",
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: 13,
        fontWeight: 500,
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
        zIndex: 1050,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span
          style={{
            background: "#4f46e5",
            color: "#fff",
            padding: "2px 8px",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.5px",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <ShieldAlert size={13} /> MODE SUPPORT PREVIEW
        </span>

        <span style={{ opacity: 0.9 }}>
          Meninjau UI/UX sebagai Owner: <strong>{currentVert.icon} {currentVert.name}</strong>
        </span>

        {/* Quick Vertical Switcher Dropdown */}
        <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
          <Select
            value={currentVert.key}
            onChange={(e) => handleSwitch(e.target.value)}
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              color: "#ffffff",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: 6,
              padding: "3px 24px 3px 8px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              appearance: "none",
              outline: "none",
            }}
          >
            {SUPPORT_VERTICALS.map((v) => (
              <option key={v.key} value={v.key} style={{ color: "#000", background: "#fff" }}>
                {v.icon} {v.name}
              </option>
            ))}
          </Select>
          <ChevronDown
            size={12}
            style={{
              position: "absolute",
              right: 6,
              pointerEvents: "none",
              color: "#ffffff",
            }}
          />
        </div>
      </div>

      <button
        onClick={handleExit}
        style={{
          background: "rgba(255, 255, 255, 0.2)",
          color: "#ffffff",
          border: "1px solid rgba(255, 255, 255, 0.4)",
          borderRadius: 6,
          padding: "4px 10px",
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 5,
          transition: "all 0.15s ease",
        }}
        title="Kembali ke Konsol Support"
      >
        <X size={13} /> Exit Preview Mode
      </button>
    </div>
  );
}
