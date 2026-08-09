import { FormEvent, useMemo, useState, useEffect } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import {
  Bell,
  Check,
  Clock,
  Monitor,
  Plus,
  RotateCcw,
  Save,
  Send,
  Settings,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Users as UsersIcon,
  Wallet,
  X,
} from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import { useApi } from "../hooks/useApi";
import {
  getBusinessProfile,
  getSettings,
  requestBusinessProfile,
  saveSettings,
  PosUser,
  createUser,
  listUsers,
  updateUserRole,
} from "../services/api";
import { useToast } from "../store/toast.store";
import { useAuthStore } from "../store/auth.store";
import Pagination from "../components/ui/Pagination";
import { usePagination } from "../hooks/usePagination";
import { BUSINESS_VERTICALS, VERTICAL_LABELS } from "../constants/verticals";
import Select from "../components/ui/Select";

// ─── Constants ──────────────────────────────────────────────────────────────

const BUSINESS_VERTICAL_OPTIONS = BUSINESS_VERTICALS.map((v) => ({
  value: v.key,
  label: v.label,
}));
const BUSINESS_TYPE_LABELS = VERTICAL_LABELS;

const PAYMENT_METHODS = [
  { key: "tunai", label: "Tunai" },
  { key: "transfer", label: "Transfer Bank" },
  { key: "qris", label: "QRIS" },
  { key: "ewallet", label: "E-Wallet" },
  { key: "komplimen", label: "Komplimen" },
];

// 'support' is a platform-wide role (cross-tenant access) and is
// intentionally not assignable here — see auth.controller.ts VALID_ROLES.
const VALID_ROLES = [
  "owner",
  "manager",
  "cashier",
  "inventory_staff",
] as const;
type UserRole = (typeof VALID_ROLES)[number];

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  cashier: "Kasir",
  inventory_staff: "Inventori",
  support: "Support",
};

function roleClass(role: string) {
  if (role === "owner") return "stock-badge--service";
  if (role === "manager") return "stock-badge--low";
  if (role === "cashier") return "stock-badge--ok";
  return "stock-badge--service";
}

// ─── Kasir Display Types ─────────────────────────────────────────────────────

const DISPLAY_TYPES = [
  {
    key: "standard",
    label: "Lecrion Standard",
    desc: "Daftar item + total. Layout klasik POS.",
    preview: (
      <div className="display-preview display-preview--standard">
        <div className="dp-items">
          <div className="dp-item">
            <span>Kopi Susu</span>
            <span>×2</span>
            <span>Rp 28.000</span>
          </div>
          <div className="dp-item">
            <span>Roti Bakar</span>
            <span>×1</span>
            <span>Rp 18.000</span>
          </div>
        </div>
        <div className="dp-total">
          <span>Total</span>
          <strong>Rp 46.000</strong>
        </div>
      </div>
    ),
  },
  {
    key: "minimalis",
    label: "Minimalis",
    desc: "Hanya angka total. Bersih, cepat dibaca pelanggan.",
    preview: (
      <div className="display-preview display-preview--minimalis">
        <div className="dp-big-total">Rp 46.000</div>
        <div className="dp-label">Total Belanja</div>
      </div>
    ),
  },
  {
    key: "split",
    label: "Split Screen",
    desc: "Kiri: item. Kanan: ringkasan pembayaran.",
    preview: (
      <div className="display-preview display-preview--split">
        <div className="dp-split-left">
          <div className="dp-item-sm">Kopi Susu ×2</div>
          <div className="dp-item-sm">Roti Bakar ×1</div>
        </div>
        <div className="dp-split-right">
          <div className="dp-split-label">Total</div>
          <div className="dp-split-val">Rp 46.000</div>
        </div>
      </div>
    ),
  },
  {
    key: "promo",
    label: "Promo & Branding",
    desc: "Tampilkan promo/logo saat idle, beralih ke transaksi saat aktif.",
    preview: (
      <div className="display-preview display-preview--promo">
        <div className="dp-promo-logo">Lecrion</div>
        <div className="dp-promo-tag">Selamat datang!</div>
        <div className="dp-promo-idle">idle mode</div>
      </div>
    ),
  },
] as const;

type DisplayTypeKey = (typeof DISPLAY_TYPES)[number]["key"];

// Keys belonging to each settings section
const TOKO_KEYS = [
  "storeName",
  "storeAddress",
  "storePhone",
  "businessType",
  "defaultOrderType",
];
const KASIR_KEYS = [
  "hideProductStock",
  "kasirDisplayEnabled",
  "kasirDisplayType",
  "requireOpeningCash",
  "requireClosingCash",
  "autoCloseKasir",
  "autoCloseTime",
  "allowSaveOrder",
  "kasirPaymentMethods",
];
const NOTIFIKASI_KEYS = [
  "lowStockAlertsEnabled",
  "lowStockThreshold",
  "lowStockAlertTargets",
  "adminPhones",
];

const NAV_SECTIONS = [
  { id: "toko", label: "Konfigurasi Toko", Icon: Settings },
  { id: "kasir", label: "Pengaturan Kasir", Icon: Settings2 },
  { id: "notifikasi", label: "Notifikasi & WhatsApp", Icon: Bell },
  { id: "bisnis", label: "Kategori Bisnis", Icon: Monitor },
  { id: "pengguna", label: "Manajemen Pengguna", Icon: UsersIcon },
] as const;

// ─── Component ───────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { section = "toko" } = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const currentUser = useAuthStore((s) => s.user);
  const isOwner = currentUser?.role === "owner";

  // Redirect invalid sections
  const validSections = NAV_SECTIONS.map((s) => s.id) as readonly string[];
  useEffect(() => {
    if (!validSections.includes(section))
      navigate("/settings/toko", { replace: true });
    if (section === "pengguna" && !isOwner)
      navigate("/settings/toko", { replace: true });
  }, [section, isOwner, navigate, validSections]);

  // ── API ────────────────────────────────────────────────────────────────
  const settingsApi = useApi(getSettings, []);
  const profileApi = useApi(getBusinessProfile, []);
  const usersApi = useApi(listUsers, []);

  // ── Shared form state (persists across section navigation) ─────────────
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settingsApi.data) {
      const d = settingsApi.data as Record<string, string>;
      setForm({
        // Toko
        storeName: d.storeName ?? "",
        storeAddress: d.storeAddress ?? "",
        storePhone: d.storePhone ?? "",
        businessType: d.businessType ?? "general",
        defaultOrderType: d.defaultOrderType ?? "pickup",
        // Kasir
        hideProductStock: d.hideProductStock ?? "false",
        kasirDisplayEnabled: d.kasirDisplayEnabled ?? "false",
        kasirDisplayType: d.kasirDisplayType ?? "standard",
        requireOpeningCash: d.requireOpeningCash ?? "false",
        requireClosingCash: d.requireClosingCash ?? "false",
        autoCloseKasir: d.autoCloseKasir ?? "false",
        autoCloseTime: d.autoCloseTime ?? "00:00",
        allowSaveOrder: d.allowSaveOrder ?? "true",
        kasirPaymentMethods: d.kasirPaymentMethods ?? "tunai,transfer,qris",
        // Notifikasi
        lowStockAlertsEnabled: d.lowStockAlertsEnabled ?? "false",
        lowStockThreshold: d.lowStockThreshold ?? "",
        lowStockAlertTargets: d.lowStockAlertTargets ?? "",
        adminPhones: d.adminPhones ?? "",
      });
    }
  }, [settingsApi.data]);

  // ── Business profile ───────────────────────────────────────────────────
  const [requestedVertical, setRequestedVertical] = useState("general");
  const [requestingVertical, setRequestingVertical] = useState(false);

  useEffect(() => {
    if (profileApi.data) {
      setRequestedVertical(
        profileApi.data.requestedBusinessVertical ??
          profileApi.data.verifiedBusinessVertical,
      );
    }
  }, [profileApi.data]);

  // ── Users state ────────────────────────────────────────────────────────
  const usersRows = usersApi.data ?? [];
  const pagination = usePagination(usersRows, 20);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    role: "cashier" as UserRole,
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRole, setEditRole] = useState<UserRole>("cashier");
  const [userSaving, setUserSaving] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  const userStats = useMemo(
    () => ({
      total: usersRows.length,
      owner: usersRows.filter((u) => u.role === "owner").length,
      manager: usersRows.filter((u) => u.role === "manager").length,
      cashier: usersRows.filter((u) => u.role === "cashier").length,
    }),
    [usersRows],
  );

  // ── Helpers ────────────────────────────────────────────────────────────

  function setField(key: string, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }
  function toggle(key: string) {
    setForm((p) => ({ ...p, [key]: p[key] === "true" ? "false" : "true" }));
  }
  function togglePayment(key: string) {
    const methods = (form.kasirPaymentMethods ?? "").split(",").filter(Boolean);
    const idx = methods.indexOf(key);
    if (idx === -1) methods.push(key);
    else methods.splice(idx, 1);
    setForm((p) => ({ ...p, kasirPaymentMethods: methods.join(",") }));
  }
  const on = (key: string) => form[key] === "true";
  const hasPm = (key: string) =>
    (form.kasirPaymentMethods ?? "").split(",").includes(key);

  /** Save only the keys that belong to the current section. */
  async function handleSave(e: FormEvent, keys: string[]) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = Object.fromEntries(keys.map((k) => [k, form[k] ?? ""]));
      await saveSettings(payload);
      toast.success("Pengaturan berhasil disimpan");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  function resetSection(keys: string[]) {
    if (!settingsApi.data) return;
    const d = settingsApi.data as Record<string, string>;
    setForm((p) => ({
      ...p,
      ...Object.fromEntries(keys.map((k) => [k, d[k] ?? ""])),
    }));
  }

  async function handleRequestVertical() {
    setRequestingVertical(true);
    try {
      await requestBusinessProfile(requestedVertical);
      await profileApi.reload();
      toast.success("Permintaan kategori bisnis berhasil dikirim");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal mengajukan");
    } finally {
      setRequestingVertical(false);
    }
  }

  async function submitCreate(e: FormEvent) {
    e.preventDefault();
    if (!createForm.email.trim() || !createForm.password) {
      setUserError("Email dan password wajib diisi.");
      return;
    }
    setUserSaving(true);
    setUserError(null);
    try {
      await createUser(createForm);
      setCreateForm({ email: "", password: "", role: "cashier" });
      setShowCreate(false);
      usersApi.reload();
    } catch (err) {
      setUserError(err instanceof Error ? err.message : String(err));
    } finally {
      setUserSaving(false);
    }
  }

  async function saveRole(user: PosUser) {
    setUserSaving(true);
    setUserError(null);
    try {
      await updateUserRole(user.id, { role: editRole });
      setEditingId(null);
      usersApi.reload();
    } catch (err) {
      setUserError(err instanceof Error ? err.message : String(err));
    } finally {
      setUserSaving(false);
    }
  }

  // ── Save bar ───────────────────────────────────────────────────────────

  function SaveBar({ keys }: { keys: string[] }) {
    return (
      <div className="settings-save-bar">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => resetSection(keys)}
        >
          <RotateCcw size={13} /> Reset
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? (
            <>
              <div className="spinner chatbot-button-spinner" /> Menyimpan…
            </>
          ) : (
            <>
              <Save size={13} /> Simpan
            </>
          )}
        </button>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <PosAppShell title="Pengaturan">
      <div className="settings-layout">
        {/* Left sticky nav */}
        <nav className="settings-sidenav">
          {NAV_SECTIONS.filter((s) => s.id !== "pengguna" || isOwner).map(
            ({ id, label, Icon }) => (
              <NavLink
                key={id}
                to={`/settings/${id}`}
                className={({ isActive }) =>
                  `settings-nav-item${isActive ? " active" : ""}`
                }
              >
                <Icon size={14} />
                {label}
              </NavLink>
            ),
          )}
        </nav>

        {/* Active section content */}
        <div className="settings-module">
          {/* ── TOKO ──────────────────────────────────────────── */}
          {section === "toko" && (
            <form
              className="settings-card"
              onSubmit={(e) => handleSave(e, TOKO_KEYS)}
            >
              <div className="settings-card-header">
                <Settings size={14} /> Konfigurasi Toko
              </div>
              <div className="settings-card-body">
                <div className="settings-form-grid">
                  <div className="form-group">
                    <label className="form-label">Nama Toko</label>
                    <input
                      className="form-input"
                      value={form.storeName ?? ""}
                      onChange={(e) => setField("storeName", e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Alamat</label>
                    <input
                      className="form-input"
                      value={form.storeAddress ?? ""}
                      onChange={(e) => setField("storeAddress", e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">No. Telepon</label>
                    <input
                      className="form-input"
                      value={form.storePhone ?? ""}
                      onChange={(e) => setField("storePhone", e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Kategori Bisnis</label>
                    <Select
                      value={form.businessType ?? "general"}
                      onChange={(e) => setField("businessType", e.target.value)}
                    >
                      {BUSINESS_VERTICAL_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tipe Pesanan Default</label>
                    <Select
                      value={form.defaultOrderType ?? "pickup"}
                      onChange={(e) =>
                        setField("defaultOrderType", e.target.value)
                      }
                    >
                      <option value="pickup">Pickup</option>
                      <option value="delivery">Delivery</option>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="settings-card-footer">
                <SaveBar keys={TOKO_KEYS} />
              </div>
            </form>
          )}

          {/* ── KASIR ─────────────────────────────────────────── */}
          {section === "kasir" && (
            <form
              className="settings-card"
              onSubmit={(e) => handleSave(e, KASIR_KEYS)}
            >
              <div className="settings-card-header">
                <Settings2 size={14} /> Pengaturan Kasir
              </div>

              <div className="ks-section-label">
                <Monitor size={12} /> Tampilan
              </div>
              <div className="ks-row">
                <div className="ks-row-info">
                  <span className="ks-row-title">Sembunyikan Stok Produk</span>
                  <span className="ks-row-desc">
                    Jumlah stok tidak tampil di kartu produk kasir
                  </span>
                </div>
                <button
                  type="button"
                  className={`ks-toggle${on("hideProductStock") ? " on" : ""}`}
                  onClick={() => toggle("hideProductStock")}
                />
              </div>
              <div className="ks-row">
                <div className="ks-row-info">
                  <span className="ks-row-title">Kasir Display</span>
                  <span className="ks-row-desc">
                    Tampilkan layar pelanggan saat transaksi berlangsung
                  </span>
                </div>
                <button
                  type="button"
                  className={`ks-toggle${on("kasirDisplayEnabled") ? " on" : ""}`}
                  onClick={() => toggle("kasirDisplayEnabled")}
                />
              </div>

              {/* ── Display type selector ── */}
              {on("kasirDisplayEnabled") && (
                <>
                  <p className="ks-section-note" style={{ paddingTop: 0 }}>
                    Pilih tipe tampilan layar pelanggan
                  </p>
                  <div className="display-type-grid">
                    {DISPLAY_TYPES.map(({ key, label, desc, preview }) => (
                      <button
                        key={key}
                        type="button"
                        className={`display-type-card${(form.kasirDisplayType ?? "standard") === key ? " selected" : ""}`}
                        onClick={() => setField("kasirDisplayType", key)}
                      >
                        <div className="display-type-preview-wrap">
                          {preview}
                        </div>
                        <div className="display-type-info">
                          <div className="display-type-name">
                            {label}
                            {(form.kasirDisplayType ?? "standard") === key && (
                              <Check size={13} />
                            )}
                          </div>
                          <div className="display-type-desc">{desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              <div className="ks-section-label">
                <Clock size={12} /> Pembukaan &amp; Penutupan
              </div>
              <div className="ks-row">
                <div className="ks-row-info">
                  <span className="ks-row-title">Wajib Input Kas Awal</span>
                  <span className="ks-row-desc">
                    Kasir harus mengisi nominal kas awal saat membuka sesi
                  </span>
                </div>
                <button
                  type="button"
                  className={`ks-toggle${on("requireOpeningCash") ? " on" : ""}`}
                  onClick={() => toggle("requireOpeningCash")}
                />
              </div>
              <div className="ks-row">
                <div className="ks-row-info">
                  <span className="ks-row-title">Isi Kas Akhir saat Tutup</span>
                  <span className="ks-row-desc">
                    Kasir wajib input nominal kas akhir saat menutup sesi
                  </span>
                </div>
                <button
                  type="button"
                  className={`ks-toggle${on("requireClosingCash") ? " on" : ""}`}
                  onClick={() => toggle("requireClosingCash")}
                />
              </div>
              <div className="ks-row">
                <div className="ks-row-info">
                  <span className="ks-row-title">Tutup Kasir Otomatis</span>
                  <span className="ks-row-desc">
                    Sesi kasir otomatis ditutup pada jam yang ditentukan
                  </span>
                </div>
                <div className="ks-row-controls">
                  {on("autoCloseKasir") && (
                    <input
                      type="time"
                      className="ks-time-input"
                      value={form.autoCloseTime ?? "00:00"}
                      onChange={(e) =>
                        setField("autoCloseTime", e.target.value)
                      }
                    />
                  )}
                  <button
                    type="button"
                    className={`ks-toggle${on("autoCloseKasir") ? " on" : ""}`}
                    onClick={() => toggle("autoCloseKasir")}
                  />
                </div>
              </div>

              <div className="ks-section-label">
                <ShoppingBag size={12} /> Operasional
              </div>
              <div className="ks-row">
                <div className="ks-row-info">
                  <span className="ks-row-title">Simpan Order</span>
                  <span className="ks-row-desc">
                    Kasir dapat menyimpan pesanan sebelum melakukan pembayaran
                  </span>
                </div>
                <button
                  type="button"
                  className={`ks-toggle${on("allowSaveOrder") ? " on" : ""}`}
                  onClick={() => toggle("allowSaveOrder")}
                />
              </div>

              <div className="ks-section-label">
                <Wallet size={12} /> Metode Pembayaran
              </div>
              <p className="ks-section-note">
                Pilih metode pembayaran yang ditampilkan di kasir
              </p>
              <div
                className="ks-payment-grid"
                style={{ padding: "4px 20px 8px" }}
              >
                {PAYMENT_METHODS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    className={`ks-payment-chip${hasPm(key) ? " active" : ""}`}
                    onClick={() => togglePayment(key)}
                  >
                    {hasPm(key) && <Check size={11} />}
                    {label}
                  </button>
                ))}
              </div>

              <div className="settings-card-footer">
                <SaveBar keys={KASIR_KEYS} />
              </div>
            </form>
          )}

          {/* ── NOTIFIKASI ────────────────────────────────────── */}
          {section === "notifikasi" && (
            <form
              className="settings-card"
              onSubmit={(e) => handleSave(e, NOTIFIKASI_KEYS)}
            >
              <div className="settings-card-header">
                <Bell size={14} /> Notifikasi &amp; WhatsApp
              </div>

              <div className="ks-row">
                <div className="ks-row-info">
                  <span className="ks-row-title">Alert Stok Menipis</span>
                  <span className="ks-row-desc">
                    Kirim notifikasi WhatsApp saat stok produk di bawah ambang
                  </span>
                </div>
                <button
                  type="button"
                  className={`ks-toggle${on("lowStockAlertsEnabled") ? " on" : ""}`}
                  onClick={() => toggle("lowStockAlertsEnabled")}
                />
              </div>

              <div className="settings-card-body" style={{ paddingTop: 8 }}>
                <div className="settings-form-grid">
                  <div className="form-group">
                    <label className="form-label">Ambang Stok Menipis</label>
                    <input
                      type="number"
                      className="form-input"
                      value={form.lowStockThreshold ?? ""}
                      onChange={(e) =>
                        setField("lowStockThreshold", e.target.value)
                      }
                      placeholder="misal: 5"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Nomor WA Alert{" "}
                      <span className="form-label-hint">(pisahkan koma)</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.lowStockAlertTargets ?? ""}
                      onChange={(e) =>
                        setField("lowStockAlertTargets", e.target.value)
                      }
                      placeholder="628111..., 628222..."
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                    <label className="form-label">
                      Nomor WA Admin{" "}
                      <span className="form-label-hint">
                        boleh akses laporan &amp; stok via WhatsApp — pisahkan
                        koma
                      </span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.adminPhones ?? ""}
                      onChange={(e) => setField("adminPhones", e.target.value)}
                      placeholder="628111..., 628222..."
                    />
                  </div>
                </div>
              </div>

              <div className="settings-card-footer">
                <SaveBar keys={NOTIFIKASI_KEYS} />
              </div>
            </form>
          )}

          {/* ── BISNIS ────────────────────────────────────────── */}
          {section === "bisnis" && (
            <div className="settings-card">
              <div className="settings-card-header">
                <Monitor size={14} /> Kategori &amp; Modul Bisnis
              </div>
              <div className="settings-card-body">
                <div className="settings-form-grid settings-form-grid--3">
                  <div className="form-group">
                    <label className="form-label">Kategori Terverifikasi</label>
                    <input
                      className="form-input"
                      readOnly
                      value={
                        BUSINESS_TYPE_LABELS[
                          profileApi.data?.verifiedBusinessVertical ?? ""
                        ] ??
                        profileApi.data?.verifiedBusinessVertical ??
                        "general"
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status Verifikasi</label>
                    <input
                      className="form-input"
                      readOnly
                      value={
                        profileApi.data?.verificationStatus ?? "unverified"
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Request Aktif</label>
                    <input
                      className="form-input"
                      readOnly
                      value={
                        BUSINESS_TYPE_LABELS[
                          profileApi.data?.requestedBusinessVertical ?? ""
                        ] ??
                        profileApi.data?.requestedBusinessVertical ??
                        "-"
                      }
                    />
                  </div>
                </div>
                <div className="settings-request-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Ajukan Kategori Bisnis</label>
                    <Select
                      value={requestedVertical}
                      onChange={(e) => setRequestedVertical(e.target.value)}
                    >
                      {BUSINESS_VERTICAL_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary settings-request-btn"
                    onClick={handleRequestVertical}
                    disabled={requestingVertical || profileApi.loading}
                  >
                    {requestingVertical ? (
                      <div
                        className="spinner"
                        style={{ width: 14, height: 14 }}
                      />
                    ) : (
                      <Send size={13} />
                    )}
                    Ajukan
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── PENGGUNA ──────────────────────────────────────── */}
          {section === "pengguna" && !isOwner && (
            <div
              className="settings-card"
              style={{ padding: 48, textAlign: "center" }}
            >
              <ShieldCheck size={36} color="var(--text-muted)" />
              <div
                style={{
                  marginTop: 12,
                  color: "var(--text-muted)",
                  fontSize: 14,
                }}
              >
                Hanya Owner yang dapat mengelola pengguna
              </div>
            </div>
          )}

          {section === "pengguna" && isOwner && (
            <div className="settings-card">
              <div className="settings-card-header">
                <UsersIcon size={14} /> Manajemen Pengguna
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ marginLeft: "auto" }}
                  onClick={() => setShowCreate((v) => !v)}
                >
                  <Plus size={13} /> Tambah Pengguna
                </button>
              </div>

              {/* Stats strip */}
              <div className="settings-user-stats">
                {[
                  { label: "Total", value: userStats.total },
                  { label: "Owner", value: userStats.owner },
                  { label: "Manager", value: userStats.manager },
                  { label: "Kasir", value: userStats.cashier },
                ].map(({ label, value }) => (
                  <div key={label} className="settings-user-stat">
                    <span className="settings-user-stat-val">{value}</span>
                    <span className="settings-user-stat-lbl">{label}</span>
                  </div>
                ))}
              </div>

              {userError && (
                <div
                  className="alert alert-error"
                  style={{
                    margin: "12px 20px 0",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {userError}
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setUserError(null)}
                    style={{ marginLeft: "auto" }}
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              {showCreate && (
                <form onSubmit={submitCreate} className="management-form">
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input
                      className="form-input"
                      type="email"
                      value={createForm.email}
                      onChange={(e) =>
                        setCreateForm((p) => ({ ...p, email: e.target.value }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password *</label>
                    <input
                      className="form-input"
                      type="password"
                      minLength={6}
                      value={createForm.password}
                      onChange={(e) =>
                        setCreateForm((p) => ({
                          ...p,
                          password: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <Select
                      value={createForm.role}
                      onChange={(e) =>
                        setCreateForm((p) => ({
                          ...p,
                          role: e.target.value as UserRole,
                        }))
                      }
                    >
                      {VALID_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 8,
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setShowCreate(false)}
                    >
                      <X size={13} /> Batal
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={userSaving}
                    >
                      <Save size={13} /> Simpan
                    </button>
                  </div>
                </form>
              )}

              <div className="dashboard-card-body" style={{ padding: 0 }}>
                {usersApi.loading ? (
                  <div className="loading-center">
                    <div className="spinner" />
                  </div>
                ) : (
                  <table className="pos-data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Dibuat</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.slice.map((user) => (
                        <tr key={user.id}>
                          <td>#{user.id}</td>
                          <td>
                            <strong>{user.email}</strong>
                          </td>
                          <td>
                            {editingId === user.id ? (
                              <Select
                                value={editRole}
                                onChange={(e) =>
                                  setEditRole(e.target.value as UserRole)
                                }
                              >
                                {VALID_ROLES.map((r) => (
                                  <option key={r} value={r}>
                                    {ROLE_LABELS[r]}
                                  </option>
                                ))}
                              </Select>
                            ) : (
                              <span
                                className={`stock-badge ${roleClass(user.role)}`}
                              >
                                {ROLE_LABELS[user.role] ?? user.role}
                              </span>
                            )}
                          </td>
                          <td>
                            {user.createdAt
                              ? new Date(user.createdAt).toLocaleDateString(
                                  "id-ID",
                                )
                              : "-"}
                          </td>
                          <td>
                            {editingId === user.id ? (
                              <div style={{ display: "flex", gap: 6 }}>
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  disabled={userSaving}
                                  onClick={() => saveRole(user)}
                                >
                                  Simpan
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => setEditingId(null)}
                                >
                                  Batal
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => {
                                  setEditingId(user.id);
                                  setEditRole(user.role as UserRole);
                                }}
                              >
                                Edit Role
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {!usersRows.length && (
                        <tr>
                          <td
                            colSpan={5}
                            style={{
                              textAlign: "center",
                              color: "var(--text-muted)",
                            }}
                          >
                            Belum ada pengguna
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
                <Pagination {...pagination} />
              </div>
            </div>
          )}
        </div>
      </div>
    </PosAppShell>
  );
}
