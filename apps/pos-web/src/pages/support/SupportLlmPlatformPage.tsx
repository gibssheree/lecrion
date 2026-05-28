import { useEffect, useState } from "react";
import { RefreshCw, Save, Wrench } from "lucide-react";
import PosAppShell from "../../components/layout/PosAppShell";
import { useApi } from "../../hooks/useApi";
import {
  getAdminLlmConfig,
  PlatformLlmConfig,
  updateAdminLlmConfig,
} from "../../services/api";
import { useToast } from "../../store/toast.store";

const ROLES: Array<{ key: string; label: string; placeholder: string }> = [
  {
    key: "customer",
    label: "Customer (chatbot WA)",
    placeholder:
      "Anda adalah asisten ramah untuk customer. Gunakan bahasa santai…",
  },
  {
    key: "admin",
    label: "Admin / Owner",
    placeholder:
      "Anda adalah analyst yang membantu owner menganalisa performa toko…",
  },
  {
    key: "cashier",
    label: "Cashier",
    placeholder:
      "Anda adalah asisten kasir. Bantu cek stok, pesanan, dan sub-total…",
  },
  {
    key: "support",
    label: "Support (internal)",
    placeholder:
      "Anda adalah asisten platform untuk tim support Lecrion. Boleh akses diagnostik…",
  },
];

const MODEL_OPTIONS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-exp",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

export default function SupportLlmPlatformPage() {
  const toast = useToast();
  const config = useApi(getAdminLlmConfig);

  const [draft, setDraft] = useState<PlatformLlmConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config.data) setDraft(structuredClone(config.data));
  }, [config.data]);

  if (!draft) {
    return (
      <PosAppShell title="LLM Platform">
        <div className="loading-center">
          <div className="spinner" />
        </div>
      </PosAppShell>
    );
  }

  function update<K extends keyof PlatformLlmConfig>(
    key: K,
    value: PlatformLlmConfig[K],
  ) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  function updatePrompt(role: string, value: string) {
    setDraft((d) =>
      d ? { ...d, systemPrompts: { ...d.systemPrompts, [role]: value } } : d,
    );
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      await updateAdminLlmConfig({
        model: draft.model,
        temperature: draft.temperature,
        maxTokens: draft.maxTokens,
        topP: draft.topP,
        systemPrompts: draft.systemPrompts,
      });
      await config.reload();
      toast.success("Konfigurasi LLM platform disimpan");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PosAppShell title="LLM Platform Config">
      <div
        className="alert alert-info"
        style={{ marginBottom: 16, fontSize: 13 }}
      >
        Konfigurasi ini berlaku <strong>platform-wide</strong> sebagai default
        untuk semua merchant. Owner masih bisa override beberapa setting di
        level toko mereka melalui Bot Settings, tapi nilai di sini adalah
        baseline & guardrail.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Model parameters */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Wrench size={14} /> Model Parameters
            </span>
            <button className="btn btn-ghost btn-sm" onClick={config.reload}>
              <RefreshCw size={13} />
            </button>
          </div>
          <div className="dashboard-card-body">
            <div className="form-group">
              <label className="form-label">Model</label>
              <select
                className="form-select"
                value={draft.model}
                onChange={(e) => update("model", e.target.value)}
              >
                {MODEL_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">
                Temperature ({draft.temperature.toFixed(2)})
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={draft.temperature}
                onChange={(e) =>
                  update("temperature", parseFloat(e.target.value))
                }
                style={{ width: "100%" }}
              />
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginTop: 4,
                }}
              >
                0 = deterministik, 1 = sangat kreatif
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">
                Top-P ({draft.topP.toFixed(2)})
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={draft.topP}
                onChange={(e) => update("topP", parseFloat(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Max Tokens</label>
              <input
                className="form-input"
                type="number"
                min={64}
                max={8192}
                step={64}
                value={draft.maxTokens}
                onChange={(e) =>
                  update("maxTokens", parseInt(e.target.value, 10) || 1024)
                }
              />
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span>Status</span>
          </div>
          <div className="dashboard-card-body">
            <div className="shift-row">
              <span className="shift-row-label">Diperbarui</span>
              <span className="shift-row-value" style={{ fontSize: 11 }}>
                {draft.updatedAt
                  ? new Date(draft.updatedAt).toLocaleString("id-ID")
                  : "belum pernah"}
              </span>
            </div>
            <div className="shift-row">
              <span className="shift-row-label">Oleh</span>
              <span className="shift-row-value">{draft.updatedBy ?? "—"}</span>
            </div>
            <button
              className="btn btn-primary btn-full"
              style={{ marginTop: 16 }}
              onClick={save}
              disabled={saving}
            >
              {saving ? (
                <div className="spinner" style={{ width: 14, height: 14 }} />
              ) : (
                <Save size={13} />
              )}
              Simpan konfigurasi
            </button>
          </div>
        </div>
      </div>

      {/* System prompts per role */}
      <div className="dashboard-card" style={{ marginTop: 16 }}>
        <div className="dashboard-card-header">
          <span>Base System Prompts (per role)</span>
        </div>
        <div
          className="dashboard-card-body"
          style={{ display: "grid", gap: 16 }}
        >
          {ROLES.map((r) => (
            <div className="form-group" key={r.key}>
              <label className="form-label">{r.label}</label>
              <textarea
                className="form-input"
                rows={4}
                placeholder={r.placeholder}
                value={draft.systemPrompts[r.key] ?? ""}
                onChange={(e) => updatePrompt(r.key, e.target.value)}
                style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}
              />
            </div>
          ))}
        </div>
      </div>
    </PosAppShell>
  );
}
