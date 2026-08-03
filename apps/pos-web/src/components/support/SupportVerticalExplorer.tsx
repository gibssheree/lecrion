// apps/pos-web/src/components/support/SupportVerticalExplorer.tsx
import { useNavigate } from "react-router-dom";
import { Eye, Layers, CheckCircle2, ArrowRight } from "lucide-react";
import {
  SUPPORT_VERTICALS,
  useSupportPreviewStore,
} from "../../store/support-preview.store";
import { useToast } from "../../store/toast.store";

export default function SupportVerticalExplorer() {
  const navigate = useNavigate();
  const toast = useToast();
  const enablePreview = useSupportPreviewStore((s) => s.enablePreview);
  const activeVerticalKey = useSupportPreviewStore((s) => s.activeVerticalKey);
  const isPreviewActive = useSupportPreviewStore((s) => s.isPreviewActive);

  function handlePreview(key: string) {
    enablePreview(key);
    const vert = SUPPORT_VERTICALS.find((v) => v.key === key);
    toast.success(`Mode Support Preview Aktif: ${vert?.name ?? key}`);

    // Navigate to primary route for that vertical
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

  return (
    <div
      style={{
        marginTop: 20,
        marginBottom: 28,
        background: "var(--bg-surface, #ffffff)",
        borderRadius: 16,
        border: "1px solid var(--border, #e2e8f0)",
        padding: 20,
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "var(--text-main, #0f172a)",
            }}
          >
            <Layers size={18} color="var(--primary, #2563eb)" />
            Penjelajah Vertikal Bisnis (Support UI/UX Preview)
          </h3>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 12,
              color: "var(--text-muted, #64748b)",
            }}
          >
            Pilih tipe bisnis di bawah ini untuk menguji dan melihat tampilan UI & UX sebagai Owner tanpa mendaftar akun.
          </p>
        </div>

        {isPreviewActive && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#2563eb",
              background: "#eff6ff",
              padding: "4px 10px",
              borderRadius: 20,
              border: "1px solid #bfdbfe",
            }}
          >
            Mode Preview Aktif
          </span>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 14,
        }}
      >
        {SUPPORT_VERTICALS.map((vert) => {
          const isActive = isPreviewActive && activeVerticalKey === vert.key;

          return (
            <div
              key={vert.key}
              style={{
                borderRadius: 14,
                border: `2px solid ${isActive ? "var(--primary, #2563eb)" : "var(--border, #e2e8f0)"}`,
                background: isActive
                  ? "var(--bg-elevated, #f8fafc)"
                  : "var(--bg-surface, #ffffff)",
                padding: 16,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition: "all 0.15s ease-in-out",
                boxShadow: isActive ? "0 4px 12px rgba(37, 99, 235, 0.1)" : "none",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 28, lineHeight: 1 }}>{vert.icon}</span>
                  <div>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: 14,
                        fontWeight: 700,
                        color: "var(--text-main, #0f172a)",
                      }}
                    >
                      {vert.name}
                    </h4>
                    <span style={{ fontSize: 11, color: "var(--text-muted, #64748b)" }}>
                      Preset: <code>{vert.preset}</code>
                    </span>
                  </div>
                </div>

                <p
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary, #334155)",
                    margin: "0 0 10px",
                    lineHeight: 1.4,
                  }}
                >
                  {vert.description}
                </p>

                {/* Feature tags */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
                  {vert.features.map((feat, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 11,
                        color: "var(--text-muted, #475569)",
                      }}
                    >
                      <CheckCircle2 size={12} color="#10b981" style={{ flexShrink: 0 }} />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handlePreview(vert.key)}
                className={`btn btn-sm ${isActive ? "btn-primary" : "btn-ghost"}`}
                style={{
                  width: "100%",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 12,
                  padding: "8px 12px",
                  gap: 6,
                  borderRadius: 10,
                  border: isActive ? "none" : "1px solid var(--border, #cbd5e1)",
                }}
              >
                <Eye size={14} />
                {isActive ? "Sedang Dilihat (Owner View)" : "Lihat Vertikal Bisnis sebagai Support"}
                <ArrowRight size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
