import dashboardPreview from "../../assets/dashboard-preview.png";
import Section from "../layout/Section";

const FEED = [
  { ts: "16:42", text: "Order #2847 — Kopi Susu ×2, Croissant ×1" },
  { ts: "16:41", text: "KDS: tiket T-0091 siap disajikan" },
  { ts: "16:40", text: "Stok Arabica turun ke 8 kg, threshold 10 kg" },
  { ts: "16:38", text: "Shift Kasir Rina ditutup, total Rp 3.150.000" },
  { ts: "16:37", text: "WhatsApp order #2848 dari +62812-xxxx-3847" },
];

export default function ProductPreviewSection() {
  return (
    <Section id="product" tone="light">
      <div className="lp-section-heading">
        <span>Produk</span>
        <h2>
          Owner, kasir, dapur, dan admin
          <br />
          <em>baca data yang sama.</em>
        </h2>
        <p>
          Tidak ada rekap manual. Tidak ada data yang tercecer di spreadsheet
          atau chat.
        </p>
      </div>

      <div className="lp-preview-grid">
        <div className="lp-preview-screen">
          <div className="lp-preview-chrome" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <img
            src={dashboardPreview}
            alt="Dashboard Lecrion menampilkan ringkasan penjualan, stok, dan shift aktif"
            className="lp-preview-img"
          />
        </div>

        <aside className="lp-preview-panel" aria-label="Aktivitas outlet">
          <div className="lp-preview-panel__header">
            <span className="lp-preview-live-dot" aria-hidden="true" />
            <strong>Aktivitas outlet</strong>
            <span className="lp-preview-panel__time">Baru saja</span>
          </div>

          <div className="lp-preview-kpis">
            <div className="lp-preview-kpi">
              <strong>Rp 8.420.000</strong>
              <span>Pendapatan</span>
            </div>
            <div className="lp-preview-kpi">
              <strong>186</strong>
              <span>Transaksi</span>
            </div>
            <div className="lp-preview-kpi">
              <strong>92%</strong>
              <span>Stok aman</span>
            </div>
          </div>

          <div className="lp-preview-feed">
            {FEED.map((item) => (
              <div key={item.ts} className="lp-preview-feed__item">
                <span className="ts">{item.ts}</span>
                {item.text}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </Section>
  );
}
