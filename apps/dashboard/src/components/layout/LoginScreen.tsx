import { useState } from "react";
import { MessageSquare, LogIn } from "lucide-react";
import { useAuth } from "../../store/auth.store";

/**
 * LoginScreen — shown when the user is not authenticated.
 * Reads login actions from the auth store — no props needed.
 */
export function LoginScreen() {
  const { handleLogin, loginError, loginLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await handleLogin(email, password);
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--bg-base)",
      }}
    >
      <div
        className="card"
        style={{ width: 360, padding: "32px 28px", gap: 20 }}
      >
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              borderRadius: "var(--radius)",
              background: "var(--primary)",
              marginBottom: 12,
            }}
          >
            <MessageSquare size={22} color="#fff" strokeWidth={2.5} />
          </div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Lecrion Dashboard</h2>
          <p
            style={{
              margin: "4px 0 0",
              color: "var(--text-muted)",
              fontSize: 13,
            }}
          >
            Masuk untuk melanjutkan
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div>
            <label
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                display: "block",
                marginBottom: 4,
              }}
            >
              Email
            </label>
            <input
              className="form-input"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                display: "block",
                marginBottom: 4,
              }}
            >
              Password
            </label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: "100%" }}
            />
          </div>

          {loginError && (
            <div className="alert error" style={{ margin: 0 }}>
              {loginError}
            </div>
          )}

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loginLoading}
            style={{
              marginTop: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {loginLoading ? (
              <>
                <div className="spinner" style={{ width: 14, height: 14 }} />{" "}
                Masuk…
              </>
            ) : (
              <>
                <LogIn size={14} /> Masuk
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
