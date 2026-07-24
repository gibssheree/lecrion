import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import PosAppShell from "../../components/layout/PosAppShell";
import { useApi } from "../../hooks/useApi";
import {
  getAdminStoreActivity,
  getAdminStoreBusinessProfile,
  getAdminStoreCapabilities,
  getAdminStoreUsers,
  setStoreModuleOverride,
  verifyStoreBusinessProfile,
} from "../../services/api";
import { fmt } from "../../utils/fmt";
import { useToast } from "../../store/toast.store";
import { BUSINESS_VERTICALS } from "../../constants/verticals";

const VERTICAL_OPTIONS = BUSINESS_VERTICALS.map((v) => ({
  value: v.key,
  label: v.label,
}));

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

type Tab = "profile" | "modules" | "users" | "activity";

export default function SupportMerchantDetailPage() {
  const { storeId = "" } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("profile");

  const profile = useApi(
    () => getAdminStoreBusinessProfile(storeId),
    [storeId],
  );
  const capabilities = useApi(
    () => getAdminStoreCapabilities(storeId),
    [storeId],
  );
  const activity = useApi(() => getAdminStoreActivity(storeId), [storeId], {
    autoRefreshMs: 30_000,
  });
  const users = useApi(() => getAdminStoreUsers(storeId), [storeId]);

  const [verifyVertical, setVerifyVertical] = useState("general");
  const [verifyNotes, setVerifyNotes] = useState("");
  const [moduleKey, setModuleKey] = useState("fnb.kds");
  const [moduleEnabled, setModuleEnabled] = useState(true);
  const [moduleReason, setModuleReason] = useState("");
  const [savingVerify, setSavingVerify] = useState(false);
  const [savingModule, setSavingModule] = useState(false);

  useEffect(() => {
    if (profile.data) setVerifyVertical(profile.data.verifiedBusinessVertical);
  }, [profile.data]);

  async function refreshAll() {
    await Promise.all([
      profile.reload(),
      capabilities.reload(),
      activity.reload(),
      users.reload(),
    ]);
  }

  async function verify() {
    setSavingVerify(true);
    try {
      await verifyStoreBusinessProfile(storeId, verifyVertical, verifyNotes);
      setVerifyNotes("");
      await refreshAll();
      toast.success("Verifikasi berhasil disimpan");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingVerify(false);
    }
  }

  async function applyOverride() {
    setSavingModule(true);
    try {
      await setStoreModuleOverride(
        storeId,
        moduleKey,
        moduleEnabled,
        moduleReason,
      );
      setModuleReason("");
      await capabilities.reload();
      toast.success("Override modul disimpan");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingModule(false);
    }
  }

  return (
    <PosAppShell title={`Merchant — ${storeId}`}>
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => navigate("/support/merchants")}
        style={{ marginBottom: 12 }}
      >
        <ArrowLeft size={13} /> Kembali ke daftar
      </button>

      {/* KPI strip */}
      <div className="summary-grid" style={{ marginBottom: 16 }}>
        <div className="summary-card">
          <div className="summary-card-label">Vertical Aktif</div>
          <div className="summary-card-value" style={{ fontSize: 16 }}>
            {profile.data?.verifiedBusinessVertical ?? "—"}
          </div>
          {profile.data?.requestedBusinessVertical && (
            <div
              className="summary-card-sub"
              style={{ color: "var(--stock-low)" }}
            >
              Diminta: {profile.data.requestedBusinessVertical}
            </div>
          )}
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Status</div>
          <div className="summary-card-value" style={{ fontSize: 16 }}>
            {profile.data?.verificationStatus ?? "—"}
          </div>
          <div className="summary-card-sub">
            {profile.data?.verifiedAt
              ? `Diverifikasi ${new Date(
                  profile.data.verifiedAt,
                ).toLocaleDateString("id-ID")}`
              : "belum diverifikasi"}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Pengguna</div>
          <div className="summary-card-value">
            {activity.data?.userCount ?? "—"}
          </div>
          <div className="summary-card-sub">
            {activity.data?.productCount ?? 0} produk
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Aktivitas</div>
          <div className="summary-card-value" style={{ fontSize: 16 }}>
            {activity.data?.activeRegister ? "REGISTER AKTIF" : "TIDAK AKTIF"}
          </div>
          <div className="summary-card-sub">
            {activity.data?.lastSaleAt
              ? `Sale terakhir: ${new Date(
                  activity.data.lastSaleAt,
                ).toLocaleString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : "belum ada sale"}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="support-tabs">
        {(
          [
            { id: "profile", label: "Profil & Verifikasi" },
            { id: "modules", label: "Modul" },
            { id: "users", label: "Pengguna" },
            { id: "activity", label: "Aktivitas" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            className={`support-tab${tab === t.id ? " is-active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        <button
          className="btn btn-ghost btn-sm"
          onClick={refreshAll}
          style={{ marginLeft: "auto" }}
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Tab content */}
      {tab === "profile" && (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span>
              <ShieldCheck size={14} /> Verifikasi Business Vertical
            </span>
          </div>
          <div className="dashboard-card-body">
            <div className="form-group">
              <label className="form-label">Business Vertical</label>
              <select
                className="form-select"
                value={verifyVertical}
                onChange={(e) => setVerifyVertical(e.target.value)}
              >
                {VERTICAL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Catatan (opsional)</label>
              <input
                className="form-input"
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                placeholder="Misal: 'Approved setelah verifikasi telepon'"
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={verify}
              disabled={savingVerify}
            >
              {savingVerify ? (
                <div className="spinner" style={{ width: 14, height: 14 }} />
              ) : (
                <Save size={13} />
              )}
              Simpan & Verifikasi
            </button>
          </div>
        </div>
      )}

      {tab === "modules" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
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
                  onChange={(e) => setModuleKey(e.target.value)}
                >
                  {MODULE_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={moduleEnabled ? "enabled" : "disabled"}
                  onChange={(e) =>
                    setModuleEnabled(e.target.value === "enabled")
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
                  onChange={(e) => setModuleReason(e.target.value)}
                  placeholder="Opsional"
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={applyOverride}
                disabled={savingModule}
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

          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <span>Modul Aktif</span>
            </div>
            <div className="dashboard-card-body">
              {capabilities.loading ? (
                <div className="loading-center">
                  <div className="spinner" />
                </div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {(capabilities.data?.enabledModules ?? []).map((m) => (
                    <span className="stock-badge stock-badge--ok" key={m}>
                      {m}
                    </span>
                  ))}
                  {(capabilities.data?.enabledModules ?? []).length === 0 && (
                    <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      Belum ada modul aktif.
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span>
              <Users size={14} /> Pengguna di Merchant Ini
            </span>
          </div>
          <div className="dashboard-card-body" style={{ padding: 0 }}>
            {users.loading ? (
              <div className="loading-center">
                <div className="spinner" />
              </div>
            ) : !users.data?.length ? (
              <div
                style={{
                  padding: 24,
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: 13,
                }}
              >
                Tidak ada pengguna terdaftar.
              </div>
            ) : (
              <table className="pos-data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Dibuat</th>
                  </tr>
                </thead>
                <tbody>
                  {users.data.map((u) => (
                    <tr key={u.id}>
                      <td style={{ color: "var(--primary)", fontWeight: 600 }}>
                        #{u.id}
                      </td>
                      <td>{u.email}</td>
                      <td>{u.role}</td>
                      <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        {new Date(u.createdAt).toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === "activity" && (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span>Aktivitas Operasional</span>
          </div>
          <div className="dashboard-card-body">
            {activity.data ? (
              <>
                <div className="shift-row">
                  <span className="shift-row-label">Sales hari ini</span>
                  <span className="shift-row-value">
                    {activity.data.salesToday} transaksi
                  </span>
                </div>
                <div className="shift-row">
                  <span className="shift-row-label">Revenue hari ini</span>
                  <span className="shift-row-value">
                    Rp{fmt(activity.data.revenueToday)}
                  </span>
                </div>
                <div className="shift-row">
                  <span className="shift-row-label">Register aktif</span>
                  <span className="shift-row-value">
                    {activity.data.activeRegister
                      ? `#${activity.data.activeRegister.id} oleh ${activity.data.activeRegister.cashierId}`
                      : "tidak ada"}
                  </span>
                </div>
                <div className="shift-row">
                  <span className="shift-row-label">Sale terakhir</span>
                  <span className="shift-row-value">
                    {activity.data.lastSaleAt
                      ? new Date(activity.data.lastSaleAt).toLocaleString(
                          "id-ID",
                        )
                      : "—"}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginTop: 12,
                    fontStyle: "italic",
                  }}
                >
                  Catatan: angka revenue di atas hanya untuk diagnostik. Detail
                  finansial merchant bukan kewenangan support.
                </div>
              </>
            ) : (
              <div className="loading-center">
                <div className="spinner" />
              </div>
            )}
          </div>
        </div>
      )}
    </PosAppShell>
  );
}
