import { Link } from "react-router-dom";
import { ROUTES } from "./routePaths";

export default function NotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        gap: 16,
        color: "var(--text-muted)",
      }}
    >
      <span style={{ fontSize: 48 }}>404</span>
      <p style={{ margin: 0, fontSize: 16 }}>Halaman tidak ditemukan</p>
      <Link to={ROUTES.ROOT} className="btn btn-primary">
        Kembali ke Dashboard
      </Link>
    </div>
  );
}
