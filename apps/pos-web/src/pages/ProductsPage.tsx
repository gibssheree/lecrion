import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Edit3, ExternalLink, Package, PackageSearch, Plus, RefreshCw } from "lucide-react";
import EmptyState from "../components/ui/EmptyState";
import PosAppShell from "../components/layout/PosAppShell";
import QuickProductModal from "../features/catalog/QuickProductModal";
import { useCategories, useProducts } from "../hooks/useProducts";
import { fmt } from "../utils/fmt";
import { usePagination } from "../hooks/usePagination";
import Pagination from "../components/ui/Pagination";

export default function ProductsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");
  const [showModal, setShowModal] = useState(false);
  const products = useProducts(search, category);
  const { categories } = useCategories();

  const pagination = usePagination(products.products, 25);

  const stats = useMemo(
    () => ({
      total: products.allProducts.length,
      active: products.allProducts.filter((p) => p.isActive !== false).length,
      low: products.lowStockCount,
      out: products.outOfStockCount,
    }),
    [products.allProducts, products.lowStockCount, products.outOfStockCount],
  );

  return (
    <PosAppShell title="Manajemen Produk">
      <div className="summary-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}>
        <div className="summary-card">
          <div className="summary-card-label"><Package size={13} /> Total Produk</div>
          <div className="summary-card-value">{stats.total}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Aktif</div>
          <div className="summary-card-value">{stats.active}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Stok Menipis</div>
          <div className="summary-card-value" style={{ color: "var(--stock-low)" }}>{stats.low}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Stok Habis</div>
          <div className="summary-card-value" style={{ color: "var(--stock-out)" }}>{stats.out}</div>
        </div>
      </div>

      {products.error && <div className="alert alert-warning">{products.error}</div>}

      <div className="dashboard-card">
        <div className="dashboard-card-header" style={{ gap: 8 }}>
          <input
            className="form-input"
            placeholder="Cari nama produk atau SKU"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{ width: 260 }}
          />
          <select
            className="form-select"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            style={{ width: 180 }}
          >
            <option value="Semua">Semua kategori</option>
            {categories.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={products.reload}>
            <RefreshCw size={13} />
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowModal(true)}
            style={{ marginLeft: "auto" }}
          >
            <Plus size={13} /> Tambah / Edit Produk
          </button>
        </div>
        <div className="dashboard-card-body" style={{ padding: 0 }}>
          {products.loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : !products.products.length ? (
            <EmptyState
              icon={<PackageSearch size={44} />}
              title={search ? "Produk tidak ditemukan" : "Belum ada produk"}
              description={
                search
                  ? `Tidak ada produk yang cocok dengan "${search}". Coba kata kunci lain.`
                  : "Tambahkan produk pertama untuk mulai berjualan."
              }
              action={
                !search
                  ? { label: "Tambah Produk", onClick: () => setShowModal(true), icon: <Plus size={13} /> }
                  : undefined
              }
              compact
            />
          ) : (
            <table className="pos-data-table">
              <thead>
                <tr>
                  <th>Produk</th>
                  <th>Kategori</th>
                  <th>SKU</th>
                  <th>Harga</th>
                  <th>HPP</th>
                  <th>Stok</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pagination.slice.map((product) => (
                  <tr key={product.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/products/${product.id}`)}>
                    <td>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <strong>{product.name}</strong>
                        <ExternalLink size={10} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                      </span>
                      <div style={{ color: "var(--text-muted)", fontSize: 11 }}>
                        {product.barcode || "Tanpa barcode"}
                      </div>
                    </td>
                    <td>{product.categoryName ?? product.category ?? "-"}</td>
                    <td>{product.sku ?? "-"}</td>
                    <td>Rp{fmt(product.price)}</td>
                    <td>{product.costPrice == null ? "-" : `Rp${fmt(product.costPrice)}`}</td>
                    <td>{fmt(product.stock)}</td>
                    <td>
                      <span className={`stock-badge ${
                        product.isActive === false
                          ? "stock-badge--service"
                          : product.stock <= 0
                            ? "stock-badge--out"
                            : product.stock <= 5
                              ? "stock-badge--low"
                              : "stock-badge--ok"
                      }`}>
                        {product.isActive === false ? "Nonaktif" : product.stock <= 0 ? "Habis" : "Aktif"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Pagination {...pagination} />
        </div>
      </div>

      {showModal && (
        <QuickProductModal
          products={products.allProducts}
          categories={categories}
          onClose={() => setShowModal(false)}
          onSaved={products.reload}
        />
      )}

      <button
        className="btn btn-ghost btn-sm"
        onClick={() => setShowModal(true)}
        style={{ marginTop: 12 }}
      >
        <Edit3 size={13} /> Edit produk yang sudah ada
      </button>
    </PosAppShell>
  );
}
