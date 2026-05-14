import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, Mail, Lock, AlertCircle } from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { useRegisterStore } from "../../store/register.store";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const refresh = useRegisterStore((s) => s.refresh);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await login(email, password);
      await refresh();
      const status = useRegisterStore.getState().status;
      navigate("/dashboard", { replace: true });
    } catch {
      // error shown from store
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShoppingBag size={26} color="#fff" strokeWidth={2.5} />
            </div>
          </div>
          <h1>Lecrion POS</h1>
          <p>Masuk untuk mulai sesi kasir</p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <div>
            <label className="form-label">Email</label>
            <div style={{ position: "relative" }}>
              <Mail
                size={15}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                className="form-input"
                style={{ paddingLeft: 36 }}
                type="email"
                placeholder="kasir@lecrion.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="form-label">Password</label>
            <div style={{ position: "relative" }}>
              <Lock
                size={15}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                className="form-input"
                style={{ paddingLeft: 36 }}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={isLoading}
            style={{ marginTop: 4 }}
          >
            {isLoading ? (
              <>
                <div className="spinner" style={{ width: 16, height: 16 }} />{" "}
                Masuk…
              </>
            ) : (
              "Masuk"
            )}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "var(--text-muted)",
            marginTop: 20,
          }}
        >
          Lecrion POS v1.0.0-beta
        </p>
      </div>
    </div>
  );
}
