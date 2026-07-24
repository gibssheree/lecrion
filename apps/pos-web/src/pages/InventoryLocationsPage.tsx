import { FormEvent, useMemo, useState } from "react";
import { MapPin, Package, Plus, Save, Search, X } from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import { useApi } from "../hooks/useApi";
import {
  InventoryLocation,
  createInventoryLocation,
  getInventoryLocations,
  getInventoryStock,
  getProducts,
} from "../services/api";
import { fmt } from "../utils/fmt";

const LOCATION_TYPES = [
  { value: "warehouse", label: "Gudang" },
  { value: "store_front", label: "Toko / Display" },
  { value: "kitchen", label: "Dapur" },
  { value: "outlet", label: "Outlet" },
  { value: "transit", label: "Transit" },
];

interface LocationForm {
  name: string;
  type: string;
  isDefault: boolean;
}

const emptyForm: LocationForm = {
  name: "",
  type: "warehouse",
  isDefault: false,
};

export default function InventoryLocationsPage() {
  const locations = useApi(getInventoryLocations, []);
  const products = useApi(getProducts, []);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(
    null,
  );
  const stock = useApi(
    () =>
      selectedLocationId
        ? getInventoryStock("default-store", selectedLocationId)
        : getInventoryStock("default-store"),
    [selectedLocationId],
  );

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<LocationForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const productMap = useMemo(() => {
    const map = new Map<
      number,
      { name: string; price: number; stock: number }
    >();
    for (const product of (products.data?.products ?? []) as any[]) {
      map.set(product.id, {
        name: product.name,
        price: product.price ?? 0,
        stock: product.stock ?? 0,
      });
    }
    return map;
  }, [products.data]);

  const stockRows = useMemo(() => {
    const rows = stock.data ?? [];
    return rows
      .map((row) => ({
        ...row,
        productName: productMap.get(row.menuId)?.name ?? `#${row.menuId}`,
        unitPrice: productMap.get(row.menuId)?.price ?? 0,
      }))
      .filter((row) =>
        !search.trim()
          ? true
          : row.productName.toLowerCase().includes(search.toLowerCase()),
      );
  }, [stock.data, productMap, search]);

  const totals = useMemo(() => {
    const totalQty = stockRows.reduce((sum, row) => sum + row.qtyOnHand, 0);
    const totalValue = stockRows.reduce(
      (sum, row) => sum + row.qtyOnHand * row.unitPrice,
      0,
    );
    return { totalQty, totalValue, lineCount: stockRows.length };
  }, [stockRows]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Nama lokasi wajib diisi.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createInventoryLocation({
        name: form.name.trim(),
        type: form.type,
        isDefault: form.isDefault,
      });
      setShowForm(false);
      setForm(emptyForm);
      locations.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PosAppShell title="Stok per Lokasi">
      <div
        className="summary-grid"
        style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 16 }}
      >
        <div className="summary-card">
          <div className="summary-card-label">
            <MapPin size={13} /> Total Lokasi Aktif
          </div>
          <div className="summary-card-value">
            {(locations.data ?? []).length}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <Package size={13} /> Total Produk Tercatat
          </div>
          <div className="summary-card-value">{totals.lineCount}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Nilai Estimasi Stok</div>
          <div className="summary-card-value">Rp{fmt(totals.totalValue)}</div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 320px) 1fr",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        {/* Locations sidebar */}
        <div className="dashboard-card">
          <div
            className="dashboard-card-header"
            style={{ gap: 8, flexWrap: "wrap" }}
          >
            <MapPin size={14} color="var(--text-muted)" />
            <strong style={{ fontSize: 13 }}>Lokasi</strong>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowForm((value) => !value)}
              style={{ marginLeft: "auto" }}
            >
              <Plus size={13} /> Tambah
            </button>
          </div>

          {showForm && (
            <form onSubmit={submit} className="management-form">
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">Nama Lokasi *</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Misal: Gudang Pusat"
                />
              </div>
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">Tipe</label>
                <select
                  className="form-select"
                  value={form.type}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, type: e.target.value }))
                  }
                >
                  {LOCATION_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  gridColumn: "1 / -1",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      isDefault: e.target.checked,
                    }))
                  }
                />
                <span className="form-label" style={{ margin: 0 }}>
                  Jadikan default
                </span>
              </label>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  gridColumn: "1 / -1",
                }}
              >
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowForm(false)}
                >
                  <X size={13} /> Batal
                </button>
                <button className="btn btn-primary btn-sm" disabled={saving}>
                  <Save size={13} /> Simpan
                </button>
              </div>
            </form>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: 0,
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedLocationId(null)}
              style={{
                textAlign: "left",
                padding: "12px 18px",
                background:
                  selectedLocationId === null
                    ? "var(--primary-light)"
                    : "transparent",
                border: "none",
                borderBottom: "1px solid var(--border)",
                cursor: "pointer",
                color:
                  selectedLocationId === null
                    ? "var(--primary)"
                    : "var(--text-primary)",
                fontWeight: selectedLocationId === null ? 700 : 500,
              }}
            >
              Semua Lokasi (Global)
            </button>
            {(locations.data ?? []).map((loc: InventoryLocation) => {
              const isActive = selectedLocationId === loc.id;
              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => setSelectedLocationId(loc.id)}
                  style={{
                    textAlign: "left",
                    padding: "12px 18px",
                    background: isActive
                      ? "var(--primary-light)"
                      : "transparent",
                    border: "none",
                    borderBottom: "1px solid var(--border)",
                    cursor: "pointer",
                    color: isActive ? "var(--primary)" : "var(--text-primary)",
                    fontWeight: isActive ? 700 : 500,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <span>{loc.name}</span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      fontWeight: 500,
                    }}
                  >
                    {loc.type ?? "warehouse"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stock table */}
        <div className="dashboard-card">
          <div
            className="dashboard-card-header"
            style={{ gap: 8, flexWrap: "wrap" }}
          >
            <Search size={14} color="var(--text-muted)" />
            <input
              className="form-input"
              placeholder="Cari produk…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 260 }}
            />
            <span
              style={{
                marginLeft: "auto",
                color: "var(--text-muted)",
                fontSize: 12,
              }}
            >
              Total qty: <strong>{fmt(totals.totalQty)}</strong>
            </span>
          </div>

          <div className="dashboard-card-body" style={{ padding: 0 }}>
            {stock.loading ? (
              <div className="loading-center">
                <div className="spinner" />
              </div>
            ) : (
              <table className="pos-data-table">
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th style={{ textAlign: "right" }}>Stok di Lokasi</th>
                    <th style={{ textAlign: "right" }}>Stok Global</th>
                    <th style={{ textAlign: "right" }}>Harga</th>
                    <th style={{ textAlign: "right" }}>Estimasi Nilai</th>
                  </tr>
                </thead>
                <tbody>
                  {stockRows.map((row) => (
                    <tr key={`${row.menuId}-${row.locationId ?? "global"}`}>
                      <td style={{ fontWeight: 500 }}>{row.productName}</td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: 700,
                          color:
                            row.qtyOnHand <= 0
                              ? "var(--stock-out)"
                              : row.qtyOnHand <= 5
                                ? "var(--stock-low)"
                                : "var(--stock-ok)",
                        }}
                      >
                        {fmt(row.qtyOnHand)}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          color: "var(--text-muted)",
                        }}
                      >
                        {fmt(row.legacyStock)}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        Rp{fmt(row.unitPrice)}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        Rp{fmt(row.qtyOnHand * row.unitPrice)}
                      </td>
                    </tr>
                  ))}
                  {!stockRows.length && (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          textAlign: "center",
                          color: "var(--text-muted)",
                          padding: 24,
                        }}
                      >
                        Tidak ada produk ditemukan untuk lokasi ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </PosAppShell>
  );
}
