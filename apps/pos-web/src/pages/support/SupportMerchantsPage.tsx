import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ExternalLink, RefreshCw, Search } from "lucide-react";
import PosAppShell from "../../components/layout/PosAppShell";
import EmptyState from "../../components/ui/EmptyState";
import Pagination from "../../components/ui/Pagination";
import { usePagination } from "../../hooks/usePagination";
import { useApi } from "../../hooks/useApi";
import { listAdminStores } from "../../services/api";
import { BUSINESS_VERTICALS } from "../../constants/verticals";

const STATUS_OPTIONS = [
  { value: "", label: "Semua status" },
  { value: "verified", label: "Terverifikasi" },
  { value: "pending", label: "Menunggu" },
  { value: "unverified", label: "Belum diverifikasi" },
  { value: "rejected", label: "Ditolak" },
];

const VERTICAL_OPTIONS = [
  { value: "", label: "Semua kategori" },
  ...BUSINESS_VERTICALS.map((v) => ({ value: v.key, label: v.label })),
];

const STATUS_BADGE: Record<string, string> = {
  verified: "status-badge--open",
  pending: "status-badge--suspended",
  unverified: "status-badge--none",
  rejected: "status-badge--closed",
};

export default function SupportMerchantsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [vertical, setVertical] = useState("");

  const stores = useApi(
    () => listAdminStores({ status, vertical, q: search, limit: 200 }),
    [status, vertical],
    { autoRefreshMs: 60_000 },
  );

  const filtered = useMemo(() => {
    if (!search) return stores.data ?? [];
    const q = search.toLowerCase();
    return (stores.data ?? []).filter(
      (s) =>
        s.storeId.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        (s.ownerName?.toLowerCase().includes(q) ?? false),
    );
  }, [stores.data, search]);

  const pagination = usePagination(filtered, 25);

  return (
    <PosAppShell title="Merchant">
      <div className="dashboard-card" style={{ marginBottom: 0 }}>
        <div
          className="dashboard-card-header"
          style={{ gap: 8, flexWrap: "wrap" }}
        >
          <div
            style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}
          >
            <Search
              size={13}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              className="form-input"
              placeholder="Cari toko, owner, atau ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 30 }}
            />
          </div>
          <select
            className="form-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ width: 180 }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            className="form-select"
            value={vertical}
            onChange={(e) => setVertical(e.target.value)}
            style={{ width: 200 }}
          >
            {VERTICAL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={stores.reload}>
            <RefreshCw size={13} />
          </button>
        </div>

        <div className="dashboard-card-body" style={{ padding: 0 }}>
          {stores.loading ? (
            <div className="loading-center">
              <div className="spinner" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Building2 size={44} />}
              title="Tidak ada merchant"
              description={
                search
                  ? `Tidak ada merchant cocok dengan "${search}".`
                  : "Belum ada merchant terdaftar di platform."
              }
              compact
            />
          ) : (
            <table className="pos-data-table">
              <thead>
                <tr>
                  <th>Store ID</th>
                  <th>Nama</th>
                  <th>Vertical</th>
                  <th>Owner</th>
                  <th>Kota</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pagination.slice.map((s) => (
                  <tr
                    key={s.storeId}
                    onClick={() => navigate(`/support/merchants/${s.storeId}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={{ color: "var(--primary)", fontWeight: 600 }}>
                      {s.storeId}
                    </td>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      {s.businessVertical}
                    </td>
                    <td>{s.ownerName ?? "—"}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      {s.city ?? "—"}
                    </td>
                    <td>
                      <span
                        className={`status-badge ${
                          STATUS_BADGE[s.verificationStatus] ??
                          "status-badge--none"
                        }`}
                      >
                        {s.verificationStatus}
                      </span>
                    </td>
                    <td>
                      <ExternalLink size={12} color="var(--text-muted)" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Pagination {...pagination} />
        </div>
      </div>
    </PosAppShell>
  );
}
