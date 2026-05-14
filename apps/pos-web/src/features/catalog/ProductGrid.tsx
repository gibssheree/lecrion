import { Package } from "lucide-react";
import ProductCard from "./ProductCard";

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  category?: string;
}

interface Props {
  products: Product[];
  loading: boolean;
  search: string;
}

export default function ProductGrid({ products, loading, search }: Props) {
  if (loading) {
    return (
      <div className="loading-center">
        <div className="spinner" />
        <span>Memuat produk…</span>
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="loading-center">
        <Package size={36} color="var(--text-muted)" />
        <span style={{ color: "var(--text-muted)" }}>
          {search ? `Tidak ada produk untuk "${search}"` : "Belum ada produk"}
        </span>
      </div>
    );
  }

  return (
    <div className="product-grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
