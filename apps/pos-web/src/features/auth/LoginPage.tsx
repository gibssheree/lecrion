import { FormEvent, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  BarChart3,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MessageSquareText,
  Store,
} from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { useRegisterStore } from "../../store/register.store";
import lecrionLogo from "../../public/Lecrion.png";
import storeIllustration from "../../public/lecrion_3d.png";

type LoginMode = "operator" | "manager" | "owner";

interface ModeConfig {
  label: string;
  heading: string;
  description: string;
  placeholder: string;
}

const MODE_CONFIG: Record<LoginMode, ModeConfig> = {
  operator: {
    label: "Operator",
    heading: "Masuk sebagai Operator",
    description: "Akses kasir, stok, dan operasional outlet harian.",
    placeholder: "operator@outlet.com",
  },
  manager: {
    label: "Manager",
    heading: "Masuk sebagai Manager",
    description: "Kelola outlet, laporan, dan tim operasional.",
    placeholder: "manager@outlet.com",
  },
  owner: {
    label: "Owner",
    heading: "Masuk sebagai Owner",
    description: "Pantau performa bisnis dan kelola semua outlet.",
    placeholder: "owner@company.com",
  },
};

const MODES: LoginMode[] = ["operator", "manager", "owner"];

const BUSINESS_TYPES = [
  "Restaurant",
  "Cafe",
  "Toko Buku",
  "Toko Bangunan",
  "Gudang",
  "Minimarket",
  "Apotek",
  "Laundry",
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>("operator");
  const [bizIndex, setBizIndex] = useState(0);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const refresh = useRegisterStore((s) => s.refresh);

  const config = MODE_CONFIG[loginMode];

  // Cycle through business types every 6 s
  useEffect(() => {
    const id = setInterval(() => {
      setBizIndex((i) => (i + 1) % BUSINESS_TYPES.length);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  function handleModeChange(mode: LoginMode) {
    setLoginMode(mode);
    setEmail("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await login(email, password, loginMode);
      const user = useAuthStore.getState().user;
      if (user?.role !== "support") {
        await refresh();
      }
      navigate(user?.role === "support" ? "/support/stores" : "/dashboard", {
        replace: true,
      });
    } catch {
      // Store error is rendered below the header.
    }
  }

  return (
    <div className="auth-screen">
      <section className="auth-visual" aria-label="Ringkasan operasional">
        <div className="auth-visual-copy">
          <h1>Satu platform untuk banyak bisnis.</h1>
          <div className="auth-biz-cycle" aria-live="polite" aria-atomic="true">
            <AnimatePresence mode="wait">
              <motion.span
                key={bizIndex}
                initial={{ opacity: 0, scale: 0.92, filter: "blur(10px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.94, filter: "blur(10px)" }}
                transition={{ duration: 0.28, ease: "easeOut" }}
              >
                {BUSINESS_TYPES[bizIndex]}
              </motion.span>
            </AnimatePresence>
          </div>
          <p>
            POS, inventory, chatbot, dan dashboard terhubung dalam satu sistem
            yang sama.
          </p>

          <div className="auth-pills" aria-label="Modul operasional">
            <motion.span
              whileHover={{
                scale: 1.08,
                y: -2,
                boxShadow: "0 18px 36px rgba(15, 23, 42, 0.14)",
              }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 420, damping: 24 }}
            >
              <Store size={14} /> POS
            </motion.span>
            <motion.span
              whileHover={{
                scale: 1.08,
                y: -2,
                boxShadow: "0 18px 36px rgba(15, 23, 42, 0.14)",
              }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 420, damping: 24 }}
            >
              <BarChart3 size={14} /> Inventory
            </motion.span>
            <motion.span
              whileHover={{
                scale: 1.08,
                y: -2,
                boxShadow: "0 18px 36px rgba(15, 23, 42, 0.14)",
              }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 420, damping: 24 }}
            >
              <MessageSquareText size={14} /> Chatbot
            </motion.span>
          </div>
        </div>

        <div className="auth-illustration-wrap">
          <img
            className="auth-illustration"
            src={storeIllustration}
            alt="Ilustrasi outlet dengan kasir, inventori, dan dashboard"
          />
        </div>
      </section>

      <section className="auth-panel" aria-label="Form login">
        <div className="auth-card">
          <img className="auth-brand-logo" src={lecrionLogo} alt="Lecrion" />

          <div className="auth-title">
            <h2>{config.heading}</h2>
            <p>{config.description}</p>
          </div>

          {/* Segmented control — sits between paragraph and email input */}
          <div
            className="auth-mode-switcher"
            role="group"
            aria-label="Pilih mode login"
          >
            {MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                className={`auth-mode-btn${loginMode === mode ? " auth-mode-btn--active" : ""}`}
                onClick={() => handleModeChange(mode)}
                aria-pressed={loginMode === mode}
              >
                {MODE_CONFIG[mode].label}
              </button>
            ))}
          </div>

          {error && (
            <div className="alert alert-error auth-alert">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="login-email">Email</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input
                  id="login-email"
                  className="auth-input"
                  type="email"
                  placeholder={config.placeholder}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="login-password">Password</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="login-password"
                  className="auth-input auth-input--password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete="current-password"
                />
                {password.length > 0 && (
                  <button
                    className="auth-password-toggle"
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={
                      showPassword
                        ? "Sembunyikan password"
                        : "Tampilkan password"
                    }
                    title={
                      showPassword
                        ? "Sembunyikan password"
                        : "Tampilkan password"
                    }
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg auth-submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="spinner auth-submit-spinner" />
                  Memverifikasi
                </>
              ) : (
                "Masuk"
              )}
            </button>

            <div className="auth-register-row">
              <span>Belum punya akun?</span>
              <button
                type="button"
                className="auth-register-link"
                onClick={() => {
                  /* register flow — coming soon */
                }}
              >
                Daftar sekarang
              </button>
            </div>
          </form>

          <div className="auth-legal">
            <a
              href="/kebijakan-privasi"
              target="_blank"
              rel="noopener noreferrer"
            >
              Kebijakan Privasi
            </a>
            <span aria-hidden="true">·</span>
            <a
              href="/syarat-ketentuan"
              target="_blank"
              rel="noopener noreferrer"
            >
              Syarat &amp; Ketentuan
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
