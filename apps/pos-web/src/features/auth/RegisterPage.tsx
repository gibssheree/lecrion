import { FormEvent, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  Phone,
  Store,
  User,
} from "lucide-react";
import Radio from "../../components/ui/Radio";
const lecrionLogo = "/Lecrion.png";

// ── Types ────────────────────────────────────────────────────────────────────

interface Step1 {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface Step2 {
  storeName: string;
  businessVertical: string;
  city: string;
}

interface Step3 {
  taxEnabled: boolean;
  taxRate: string;
  taxMode: "inclusive" | "exclusive";
  serviceChargeEnabled: boolean;
  serviceChargeRate: string;
}

// ── SVG Icons per vertical ────────────────────────────────────────────────────

function IconRestaurant() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </svg>
  );
}

function IconCafe() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
      <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
      <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
      <line x1="6" x2="6" y1="2" y2="4" />
      <line x1="10" x2="10" y1="2" y2="4" />
      <line x1="14" x2="14" y1="2" y2="4" />
    </svg>
  );
}

function IconRetail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <line x1="3" x2="21" y1="6" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function IconHotel() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
      <path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8" />
      <path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
      <path d="M12 4v6" />
      <path d="M2 18h20" />
      <path d="M7 14h2v4H7z" />
      <path d="M15 14h2v4h-2z" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
      <rect x="2" y="6" width="20" height="16" rx="1" />
      <path d="M12 6V2" />
      <path d="M2 10h20" />
      <path d="M2 14h20" />
      <path d="M2 18h20" />
      <path d="M6 6v16" />
      <path d="M10 6v16" />
      <path d="M14 6v16" />
      <path d="M18 6v16" />
    </svg>
  );
}

// ── Business vertical cards ───────────────────────────────────────────────────

const VERTICALS = [
  {
    key: "restaurant",
    icon: <IconRestaurant />,
    label: "Restoran",
    desc: "Meja, dapur, dine-in & delivery",
  },
  {
    key: "cafe",
    icon: <IconCafe />,
    label: "Cafe",
    desc: "Minuman, pastry, take-away",
  },
  {
    key: "retail_store",
    icon: <IconRetail />,
    label: "Retail Store",
    desc: "Barcode, varian produk, kasir",
  },
  {
    key: "accommodation",
    icon: <IconHotel />,
    label: "Akomodasi / Hotel",
    desc: "Kamar, check-in, layanan tamu",
  },
  {
    key: "building_materials",
    icon: <IconBuilding />,
    label: "Toko Bangunan",
    desc: "Material, satuan, proyek",
  },
];

const STEP_LABELS = ["Akun Pemilik", "Profil Bisnis", "Konfigurasi Awal"];

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 48 : -48,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? -48 : 48,
    opacity: 0,
  }),
};

// ── Component ────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [s1, setS1] = useState<Step1>({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [s2, setS2] = useState<Step2>({
    storeName: "",
    businessVertical: "",
    city: "",
  });

  const [s3, setS3] = useState<Step3>({
    taxEnabled: false,
    taxRate: "11",
    taxMode: "inclusive",
    serviceChargeEnabled: false,
    serviceChargeRate: "5",
  });

  function goNext() {
    setError(null);
    if (step === 1) {
      if (!s1.name || !s1.email || !s1.phone || !s1.password || !s1.confirmPassword) {
        setError("Semua field wajib diisi.");
        return;
      }
      if (s1.password.length < 8) {
        setError("Password minimal 8 karakter.");
        return;
      }
      if (s1.password !== s1.confirmPassword) {
        setError("Password dan konfirmasi password tidak cocok.");
        return;
      }
    }
    if (step === 2) {
      if (!s2.storeName || !s2.businessVertical) {
        setError("Nama toko dan jenis bisnis wajib dipilih.");
        return;
      }
    }
    setDir(1);
    setStep((s) => s + 1);
  }

  function goBack() {
    setError(null);
    setDir(-1);
    setStep((s) => s - 1);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: s1.name,
          email: s1.email,
          phone: s1.phone,
          password: s1.password,
          storeName: s2.storeName,
          businessVertical: s2.businessVertical,
          city: s2.city || undefined,
          taxEnabled: s3.taxEnabled,
          taxRate: s3.taxEnabled ? parseFloat(s3.taxRate) : 0,
          taxMode: s3.taxMode,
          serviceChargeEnabled: s3.serviceChargeEnabled,
          serviceChargeRate: s3.serviceChargeEnabled
            ? parseFloat(s3.serviceChargeRate)
            : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? "Pendaftaran gagal.");
      }
      navigate("/login?registered=1", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setIsLoading(false);
    }
  }

  const progress = (step / 3) * 100;

  return (
    <div className="reg-screen">
      {/* ── Left visual panel ── */}
      <section className="reg-visual" aria-hidden="true">
        <div className="reg-visual-inner">
          <div className="reg-brand">
            <img src={lecrionLogo} alt="Lecrion" className="reg-logo" />
          </div>

          <div className="reg-visual-copy">
            <h2>Mulai perjalanan bisnis Anda.</h2>
            <p>
              Daftar gratis dan kelola operasional toko Anda dalam satu platform
              yang terintegrasi.
            </p>
          </div>

          <div className="reg-feature-list">
            {[
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><path d="M20 6 9 17l-5-5"/></svg>
                ),
                text: "POS kasir siap pakai",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><path d="M20 6 9 17l-5-5"/></svg>
                ),
                text: "Manajemen inventori real-time",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><path d="M20 6 9 17l-5-5"/></svg>
                ),
                text: "Chatbot WhatsApp terintegrasi",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><path d="M20 6 9 17l-5-5"/></svg>
                ),
                text: "Laporan & forecasting lengkap",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><path d="M20 6 9 17l-5-5"/></svg>
                ),
                text: "5 vertikal bisnis didukung",
              },
            ].map((f) => (
              <div className="reg-feature-item" key={f.text}>
                <span className="reg-feature-check">{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>

          <div className="reg-step-preview">
            {STEP_LABELS.map((label, i) => (
              <div
                key={label}
                className={`reg-step-dot ${step === i + 1 ? "reg-step-dot--active" : ""} ${step > i + 1 ? "reg-step-dot--done" : ""}`}
              >
                <div className="reg-step-dot-circle">
                  {step > i + 1 ? <Check size={12} /> : i + 1}
                </div>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Right form panel ── */}
      <section className="reg-panel" aria-label="Form pendaftaran">
        <div className="reg-card">
          {/* Progress bar */}
          <div className="reg-progress-bar">
            <motion.div
              className="reg-progress-fill"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          </div>

          {/* Header */}
          <div className="reg-header">
            <div className="reg-step-label">
              Langkah {step} dari {STEP_LABELS.length}
            </div>
            <h2 className="reg-title">{STEP_LABELS[step - 1]}</h2>
          </div>

          {/* Error */}
          {error && (
            <div className="alert alert-error reg-alert">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* Animated step content */}
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="reg-step-body"
            >
              {step === 1 && (
                <Step1Form
                  data={s1}
                  onChange={setS1}
                  showPassword={showPassword}
                  togglePassword={() => setShowPassword((v) => !v)}
                  showConfirm={showConfirm}
                  toggleConfirm={() => setShowConfirm((v) => !v)}
                />
              )}
              {step === 2 && <Step2Form data={s2} onChange={setS2} />}
              {step === 3 && (
                <Step3Form data={s3} onChange={setS3} onSubmit={handleSubmit} isLoading={isLoading} />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="reg-nav">
            {step === 1 ? (
              <Link to="/login" className="reg-nav-back-link">
                <ArrowLeft size={14} /> Sudah punya akun? Masuk
              </Link>
            ) : (
              <button
                type="button"
                className="btn reg-btn-back"
                onClick={goBack}
                disabled={isLoading}
              >
                <ArrowLeft size={14} /> Kembali
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                className="btn btn-primary reg-btn-next"
                onClick={goNext}
              >
                Lanjut <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="submit"
                form="reg-form-step3"
                className="btn btn-primary reg-btn-next"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="spinner reg-spinner" /> Mendaftar...
                  </>
                ) : (
                  <>
                    Daftar Sekarang <Check size={14} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Step 1: Akun Pemilik ─────────────────────────────────────────────────────

function Step1Form({
  data,
  onChange,
  showPassword,
  togglePassword,
  showConfirm,
  toggleConfirm,
}: {
  data: Step1;
  onChange: (d: Step1) => void;
  showPassword: boolean;
  togglePassword: () => void;
  showConfirm: boolean;
  toggleConfirm: () => void;
}) {
  const set = (key: keyof Step1) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...data, [key]: e.target.value });

  const strength = getPasswordStrength(data.password);

  return (
    <div className="reg-fields">
      <div className="reg-field">
        <label htmlFor="reg-name">Nama Lengkap</label>
        <div className="reg-input-wrap">
          <User size={15} className="reg-input-icon" />
          <input
            id="reg-name"
            className="reg-input"
            type="text"
            placeholder="John Doe"
            value={data.name}
            onChange={set("name")}
            autoComplete="name"
            autoFocus
          />
        </div>
      </div>

      <div className="reg-field">
        <label htmlFor="reg-email">Email</label>
        <div className="reg-input-wrap">
          <Mail size={15} className="reg-input-icon" />
          <input
            id="reg-email"
            className="reg-input"
            type="email"
            placeholder="owner@bisnis.com"
            value={data.email}
            onChange={set("email")}
            autoComplete="email"
          />
        </div>
      </div>

      <div className="reg-field">
        <label htmlFor="reg-phone">Nomor HP (WhatsApp)</label>
        <div className="reg-input-wrap">
          <Phone size={15} className="reg-input-icon" />
          <input
            id="reg-phone"
            className="reg-input"
            type="tel"
            placeholder="08xxxxxxxxxx"
            value={data.phone}
            onChange={set("phone")}
            autoComplete="tel"
          />
        </div>
      </div>

      <div className="reg-field">
        <label htmlFor="reg-password">Password</label>
        <div className="reg-input-wrap">
          <Lock size={15} className="reg-input-icon" />
          <input
            id="reg-password"
            className="reg-input reg-input--password"
            type={showPassword ? "text" : "password"}
            placeholder="Min. 8 karakter"
            value={data.password}
            onChange={set("password")}
            autoComplete="new-password"
          />
          {data.password.length > 0 && (
            <button
              type="button"
              className="reg-password-toggle"
              onClick={togglePassword}
              aria-label={showPassword ? "Sembunyikan" : "Tampilkan"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
        {data.password.length > 0 && (
          <div className="reg-strength">
            <div className="reg-strength-bars">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`reg-strength-bar ${i < strength.score ? `reg-strength-bar--${strength.color}` : ""}`}
                />
              ))}
            </div>
            <span className={`reg-strength-label reg-strength-label--${strength.color}`}>
              {strength.label}
            </span>
          </div>
        )}
      </div>

      <div className="reg-field">
        <label htmlFor="reg-confirm">Konfirmasi Password</label>
        <div className="reg-input-wrap">
          <Lock size={15} className="reg-input-icon" />
          <input
            id="reg-confirm"
            className={`reg-input reg-input--password ${data.confirmPassword && data.password !== data.confirmPassword ? "reg-input--error" : ""}`}
            type={showConfirm ? "text" : "password"}
            placeholder="Ulangi password"
            value={data.confirmPassword}
            onChange={set("confirmPassword")}
            autoComplete="new-password"
          />
          {data.confirmPassword.length > 0 && (
            <button
              type="button"
              className="reg-password-toggle"
              onClick={toggleConfirm}
              aria-label={showConfirm ? "Sembunyikan" : "Tampilkan"}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
        {data.confirmPassword && data.password !== data.confirmPassword && (
          <p className="reg-field-error">Password tidak cocok</p>
        )}
      </div>
    </div>
  );
}

// ── Step 2: Profil Bisnis ────────────────────────────────────────────────────

function Step2Form({
  data,
  onChange,
}: {
  data: Step2;
  onChange: (d: Step2) => void;
}) {
  return (
    <div className="reg-fields">
      <div className="reg-field">
        <label htmlFor="reg-store-name">Nama Toko / Outlet</label>
        <div className="reg-input-wrap">
          <Store size={15} className="reg-input-icon" />
          <input
            id="reg-store-name"
            className="reg-input"
            type="text"
            placeholder="Contoh: Warung Pak Budi"
            value={data.storeName}
            onChange={(e) => onChange({ ...data, storeName: e.target.value })}
            autoFocus
          />
        </div>
      </div>

      <div className="reg-field">
        <label>Jenis Bisnis</label>
        <div className="reg-vertical-grid">
          {VERTICALS.map((v) => (
            <button
              key={v.key}
              type="button"
              className={`reg-vertical-card ${data.businessVertical === v.key ? "reg-vertical-card--active" : ""}`}
              onClick={() => onChange({ ...data, businessVertical: v.key })}
            >
              <span className="reg-vertical-icon">{v.icon}</span>
              <span className="reg-vertical-label">{v.label}</span>
              <span className="reg-vertical-desc">{v.desc}</span>
              {data.businessVertical === v.key && (
                <div className="reg-vertical-check">
                  <Check size={11} />
                </div>
              )}
            </button>
          ))}

        </div>
      </div>

      <div className="reg-field">
        <label htmlFor="reg-city">Kota / Lokasi <span className="reg-optional">(opsional)</span></label>
        <div className="reg-input-wrap">
          <MapPin size={15} className="reg-input-icon" />
          <input
            id="reg-city"
            className="reg-input"
            type="text"
            placeholder="Contoh: Jakarta Selatan"
            value={data.city}
            onChange={(e) => onChange({ ...data, city: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Konfigurasi Awal ─────────────────────────────────────────────────

function Step3Form({
  data,
  onChange,
  onSubmit,
  isLoading,
}: {
  data: Step3;
  onChange: (d: Step3) => void;
  onSubmit: (e: FormEvent) => void;
  isLoading: boolean;
}) {
  return (
    <form id="reg-form-step3" onSubmit={onSubmit} className="reg-fields">
      {/* Tax */}
      <div className="reg-config-card">
        <div className="reg-config-header">
          <div>
            <div className="reg-config-title">Pajak (PPN)</div>
            <div className="reg-config-desc">
              Aktifkan jika harga produk dikenakan pajak
            </div>
          </div>
          <button
            type="button"
            className={`reg-toggle ${data.taxEnabled ? "reg-toggle--on" : ""}`}
            onClick={() => onChange({ ...data, taxEnabled: !data.taxEnabled })}
            aria-pressed={data.taxEnabled}
          >
            <div className="reg-toggle-knob" />
          </button>
        </div>

        {data.taxEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="reg-config-body"
          >
            <div className="reg-config-row">
              <label htmlFor="reg-tax-rate">Tarif Pajak (%)</label>
              <input
                id="reg-tax-rate"
                className="reg-input reg-input--sm"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={data.taxRate}
                onChange={(e) => onChange({ ...data, taxRate: e.target.value })}
              />
            </div>
            <div className="reg-config-row">
              <label>Mode Pajak</label>
              <div className="reg-radio-group">
                {(["inclusive", "exclusive"] as const).map((m) => (
                  <Radio
                    key={m}
                    className="reg-radio-label"
                    name="taxMode"
                    value={m}
                    checked={data.taxMode === m}
                    onChange={() => onChange({ ...data, taxMode: m })}
                    label={m === "inclusive" ? "Sudah termasuk harga" : "Ditambah ke harga"}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Service charge */}
      <div className="reg-config-card">
        <div className="reg-config-header">
          <div>
            <div className="reg-config-title">Service Charge</div>
            <div className="reg-config-desc">
              Biaya layanan tambahan (umum untuk F&amp;B)
            </div>
          </div>
          <button
            type="button"
            className={`reg-toggle ${data.serviceChargeEnabled ? "reg-toggle--on" : ""}`}
            onClick={() =>
              onChange({
                ...data,
                serviceChargeEnabled: !data.serviceChargeEnabled,
              })
            }
            aria-pressed={data.serviceChargeEnabled}
          >
            <div className="reg-toggle-knob" />
          </button>
        </div>

        {data.serviceChargeEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="reg-config-body"
          >
            <div className="reg-config-row">
              <label htmlFor="reg-sc-rate">Tarif Service Charge (%)</label>
              <input
                id="reg-sc-rate"
                className="reg-input reg-input--sm"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={data.serviceChargeRate}
                onChange={(e) =>
                  onChange({ ...data, serviceChargeRate: e.target.value })
                }
              />
            </div>
          </motion.div>
        )}
      </div>

      <div className="reg-config-note">
        <Building2 size={13} />
        Konfigurasi ini bisa diubah kapan saja di menu <strong>Pengaturan</strong>.
      </div>
    </form>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPasswordStrength(password: string) {
  if (password.length === 0) return { score: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const map = [
    { score: 1, label: "Lemah", color: "weak" },
    { score: 2, label: "Cukup", color: "fair" },
    { score: 3, label: "Kuat", color: "good" },
    { score: 4, label: "Sangat Kuat", color: "strong" },
  ];
  return map[score - 1] ?? { score: 0, label: "Lemah", color: "weak" };
}
