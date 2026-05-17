import { FormEvent, useEffect, useState } from "react";
import {
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import { useApi } from "../hooks/useApi";
import {
  getAdminStoreBusinessProfile,
  getAdminStoreCapabilities,
  setStoreModuleOverride,
  verifyStoreBusinessProfile,
} from "../services/api";

const BUSINESS_VERTICAL_OPTIONS = [
  { value: "general", label: "General / Mixed Business" },
  { value: "retail", label: "Retail Store" },
  { value: "grocery_minimarket", label: "Grocery / Minimarket" },
  { value: "restaurant_cafe", label: "Restaurant / Cafe" },
  { value: "wholesale_distribution", label: "Wholesale / Distribution" },
  { value: "warehouse_logistics", label: "Warehouse / Logistics" },
  { value: "manufacturing", label: "Manufacturing / Production" },
  { value: "construction_materials", label: "Building Materials" },
  { value: "service_repair", label: "Services / Repair Shop" },
  { value: "health_wellness", label: "Health / Wellness" },
];

const MODULE_OPTIONS = [
  "fnb.tables",
  "fnb.kds",
  "retail.barcode",
  "retail.variants",
  "grocery.expiry_tracking",
  "warehouse.locations",
  "warehouse.transfer",
  "manufacturing.bom",
  "service.work_order",
  "health.appointment",
];

function statusClass(status?: string): string {
  if (status === "verified") return "status-badge--open";
  if (status === "pending") return "status-badge--suspended";
  if (status === "rejected") return "status-badge--closed";
  return "status-badge--none";
}

function verticalLabel(value?: string | null): string {
  return (
    BUSINESS_VERTICAL_OPTIONS.find((option) => option.value === value)?.label ??
    value ??
    "-"
  );
}

export default function SupportStoresPage() {
  const [storeIdInput, setStoreIdInput] = useState("default-store");
  const [activeStoreId, setActiveStoreId] = useState("default-store");
  const [verifyVertical, setVerifyVertical] = useState("general");
  const [verifyNotes, setVerifyNotes] = useState("");
  const [moduleKey, setModuleKey] = useState("fnb.kds");
  const [moduleEnabled, setModuleEnabled] = useState(true);
  const [moduleReason, setModuleReason] = useState("");
  const [savingVerify, setSavingVerify] = useState(false);
  const [savingModule, setSavingModule] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const profile = useApi(
    () => getAdminStoreBusinessProfile(activeStoreId),
    [activeStoreId],
  );
  const capabilities = useApi(
    () => getAdminStoreCapabilities(activeStoreId),
    [activeStoreId],
  );

  useEffect(() => {
    if (profile.data) {
      setVerifyVertical(profile.data.verifiedBusinessVertical);
    }
  }, [profile.data]);

  function loadStore(event: FormEvent) {
    event.preventDefault();
    const nextStoreId = storeIdInput.trim() || "default-store";
    setMessage(null);
    setError(null);
    if (nextStoreId === activeStoreId) {
      profile.reload();
      capabilities.reload();
      return;
    }
    setActiveStoreId(nextStoreId);
  }

  async function refreshStore() {
    setMessage(null);
    setError(null);
    await Promise.all([profile.reload(), capabilities.reload()]);
  }

  async function verifyProfile() {
    setSavingVerify(true);
    setMessage(null);
    setError(null);
    try {
      await verifyStoreBusinessProfile(
        activeStoreId,
        verifyVertical,
        verifyNotes || undefined,
      );
      setVerifyNotes("");
      await refreshStore();
      setMessage("Business vertical berhasil diverifikasi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingVerify(false);
    }
  }

  async function applyModuleOverride() {
    setSavingModule(true);
    setMessage(null);
    setError(null);
    try {
      await setStoreModuleOverride(
        activeStoreId,
        moduleKey,
        moduleEnabled,
        moduleReason || undefined,
      );
      setModuleReason("");
      await refreshStore();
      setMessage("Override modul berhasil disimpan.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingModule(false);
    }
  }

  const loading = profile.loading || capabilities.loading;
  const enabledModules = capabilities.data?.enabledModules ?? [];

  return (
    <PosAppShell title="Verifikasi Store">
      <form
        onSubmit={loadStore}
        className="dashboard-card"
        style={{ marginBottom: 16 }}
      >
        <div className="dashboard-card-header">
          <span>
            <ShieldCheck size={14} /> Target Store
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={refreshStore}
            disabled={loading}
            style={{ marginLeft: "auto" }}
          >
            <RefreshCcw size={13} /> Refresh
          </button>
        </div>
        <div
          className="dashboard-card-body"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            alignItems: "end",
          }}
        >
          <div className="form-group">
            <label className="form-label">Store ID</label>
            <input
              className="form-input"
              value={storeIdInput}
              onChange={(event) => setStoreIdInput(event.target.value)}
            />
          </div>
          <button className="btn btn-primary" disabled={loading}>
            <Search size={13} /> Load
          </button>
        </div>
      </form>

      {message && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          {message}
        </div>
      )}
      {(error || profile.error || capabilities.error) && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          {error ?? profile.error ?? capabilities.error}
        </div>
      )}

      <div className="summary-grid" style={{ marginBottom: 16 }}>
        <div className="summary-card">
          <div className="summary-card-label">Store</div>
          <div className="summary-card-value" style={{ fontSize: 18 }}>
            {activeStoreId}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Verified Vertical</div>
          <div className="summary-card-value" style={{ fontSize: 18 }}>
            {verticalLabel(profile.data?.verifiedBusinessVertical)}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Requested Vertical</div>
          <div className="summary-card-value" style={{ fontSize: 18 }}>
            {verticalLabel(profile.data?.requestedBusinessVertical)}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Status</div>
          <span
            className={`status-badge ${statusClass(
              profile.data?.verificationStatus,
            )}`}
          >
            {profile.data?.verificationStatus ?? "unverified"}
          </span>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span>
              <ShieldCheck size={14} /> Verifikasi Kategori
            </span>
          </div>
          <div className="dashboard-card-body">
            <div className="form-group">
              <label className="form-label">Business Vertical</label>
              <select
                className="form-select"
                value={verifyVertical}
                onChange={(event) => setVerifyVertical(event.target.value)}
              >
                {BUSINESS_VERTICAL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Catatan</label>
              <input
                className="form-input"
                value={verifyNotes}
                onChange={(event) => setVerifyNotes(event.target.value)}
                placeholder="Opsional"
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={verifyProfile}
              disabled={savingVerify || loading}
            >
              {savingVerify ? (
                <div className="spinner" style={{ width: 14, height: 14 }} />
              ) : (
                <Save size={13} />
              )}
              Verify Store
            </button>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span>
              <SlidersHorizontal size={14} /> Override Modul
            </span>
          </div>
          <div className="dashboard-card-body">
            <div className="form-group">
              <label className="form-label">Module Key</label>
              <select
                className="form-select"
                value={moduleKey}
                onChange={(event) => setModuleKey(event.target.value)}
              >
                {MODULE_OPTIONS.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status Modul</label>
              <select
                className="form-select"
                value={moduleEnabled ? "enabled" : "disabled"}
                onChange={(event) =>
                  setModuleEnabled(event.target.value === "enabled")
                }
              >
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Alasan</label>
              <input
                className="form-input"
                value={moduleReason}
                onChange={(event) => setModuleReason(event.target.value)}
                placeholder="Opsional"
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={applyModuleOverride}
              disabled={savingModule || loading}
            >
              {savingModule ? (
                <div className="spinner" style={{ width: 14, height: 14 }} />
              ) : (
                <Save size={13} />
              )}
              Simpan Override
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-card" style={{ marginTop: 16 }}>
        <div className="dashboard-card-header">
          <span>Enabled Modules</span>
        </div>
        <div className="dashboard-card-body">
          {loading ? (
            <div className="loading-center">
              <div className="spinner" />
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {enabledModules.map((module) => (
                <span className="stock-badge stock-badge--ok" key={module}>
                  {module}
                </span>
              ))}
              {enabledModules.length === 0 && (
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  Belum ada modul aktif.
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </PosAppShell>
  );
}
