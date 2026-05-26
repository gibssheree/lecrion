// apps/pos-web/src/pages/NotFoundPage.tsx
//
// 404 — shown when no route matches.
// Rendered inside AuthGuard so unauthenticated users are redirected to /login first.

import { useNavigate } from "react-router-dom";
import { ArrowLeft, Home, SearchX } from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <PosAppShell title="">
      <div className="not-found-page">
        <div className="not-found-icon">
          <SearchX size={52} strokeWidth={1.2} />
        </div>

        <div className="not-found-big">404</div>

        <h2 className="not-found-title">Halaman tidak ditemukan</h2>
        <p className="not-found-desc">
          Halaman yang Anda cari tidak ada, telah dipindahkan, atau Anda tidak
          memiliki akses ke halaman ini.
        </p>

        <div className="not-found-actions">
          <button
            className="btn btn-ghost"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={14} /> Kembali
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/dashboard", { replace: true })}
          >
            <Home size={14} /> Dashboard
          </button>
        </div>
      </div>
    </PosAppShell>
  );
}
