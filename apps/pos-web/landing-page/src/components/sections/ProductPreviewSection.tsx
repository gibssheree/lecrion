import { Activity, Clock3, PackageCheck, ReceiptText } from "lucide-react";
import Section from "../layout/Section";

export default function ProductPreviewSection() {
  return (
    <Section id="product">
      <div className="lp-section-heading">
        <span>Produk</span>
        <h2>Yang dipakai owner, kasir, dapur, dan admin tetap satu sistem.</h2>
        <p>Lecrion menyatukan titik transaksi dan back-office supaya data tidak pecah di spreadsheet, chat, dan aplikasi terpisah.</p>
      </div>
      <div className="lp-product-preview">
        <div className="lp-console">
          <div className="lp-console__top">
            <div>
              <span>Hari ini</span>
              <strong>Rp 8.420.000</strong>
            </div>
            <small>Live</small>
          </div>
          <div className="lp-console__metrics">
            <article><ReceiptText size={20} /><span>Order</span><strong>186</strong></article>
            <article><PackageCheck size={20} /><span>Stok aman</span><strong>92%</strong></article>
            <article><Clock3 size={20} /><span>Serve time</span><strong>6m</strong></article>
          </div>
          <div className="lp-console__feed">
            <div><Activity size={16} />Order #1042 dari WhatsApp masuk ke KDS</div>
            <div><Activity size={16} />Kasir outlet Utama menutup shift Rp 3.150.000</div>
            <div><Activity size={16} />Stok Americano low, perlu restock 12 cup</div>
          </div>
        </div>
      </div>
    </Section>
  );
}
