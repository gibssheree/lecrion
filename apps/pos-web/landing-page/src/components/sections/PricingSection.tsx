import { Check, X } from "lucide-react";
import Section from "../layout/Section";
import Button from "../ui/Button";

const PLANS = [
  {
    name: "Starter",
    tag: "Untuk UMKM mikro",
    target: "Warung, toko kecil, cafe rintisan.",
    description: "Hingga 3 outlet, operasional simpel.",
    price: 299_000,
    limits: [
      { label: "Outlet", value: "Maks 3" },
      { label: "Akun", value: "Maks 5" },
      { label: "AI Owner Assistant", value: "300 chat/bulan (10/hari)" },
      { label: "AI Customer Service", value: "1.000 chat/bulan (33/hari)" },
    ],
    features: [
      { label: "Kasir & transaksi", included: true },
      { label: "Katalog produk & stok dasar", included: true },
      { label: "Cetak struk", included: true },
      { label: "Buku kas otomatis (dasar)", included: true },
      { label: "Laporan harian dasar", included: true },
      { label: "Split payment", included: false },
      { label: "Stock opname formal", included: false },
      { label: "Approval manajer untuk shift (hanya catat selisih)", included: false },
    ],
    cta: "Coba 14 hari gratis",
  },
  {
    name: "Business",
    tag: "Untuk cafe / F&B menengah",
    target: "Sudah jalan, belum jadi chain komersial.",
    description: "Multi-outlet kecil, tim lebih besar, mulai butuh kontrol.",
    price: 699_000,
    limits: [
      { label: "Outlet", value: "Maks 8" },
      { label: "Akun", value: "Maks 9" },
      { label: "AI Owner Assistant", value: "600 chat/bulan (20/hari)" },
      { label: "AI Customer Service", value: "1.800 chat/bulan (60/hari)" },
    ],
    features: [
      { label: "Semua fitur Starter", included: true },
      { label: "Split payment", included: true },
      { label: "Stock opname (hitung → ajukan → approve)", included: true },
      { label: "Chatbot pemesanan WhatsApp", included: true },
      { label: "Asisten nutrisi (F&B)", included: true },
      { label: "Shift reconciliation + approval manajer", included: true },
      { label: "Laporan lanjutan + prediksi omzet", included: true },
      { label: "Multi-lokasi stok (gudang)", included: true },
    ],
    cta: "Coba 14 hari gratis",
    featured: true,
  },
  {
    name: "Enterprise",
    tag: "Untuk skala besar",
    target: "Franchise, hotel, distributor, multi-outlet banyak.",
    description: "Kontrol penuh, anti-fraud maksimal, modul lintas industri.",
    price: null,
    limits: [
      { label: "Outlet", value: "Maks 20" },
      { label: "Akun", value: "Maks 30" },
      { label: "AI Owner Assistant", value: "1.500 chat/bulan (50/hari)" },
      { label: "AI Customer Service", value: "6.900 chat/bulan (300/hari)" },
    ],
    features: [
      { label: "Semua fitur Business", included: true },
      { label: "Lapisan anti-fraud penuh (jejak audit semua koreksi)", included: true },
      { label: "Purchase order & penerimaan barang", included: true },
      { label: "Invoice B2B", included: true },
      { label: "Modul multi-jenis usaha (hotel, bahan bangunan, dll)", included: true },
      { label: "Ekspor data CSV", included: true },
    ],
    cta: "Hubungi sales",
  },
];

function fmt(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function PricingSection() {
  return (
    <Section id="harga" tone="paper">
      <div className="lp-section-heading">
        <h2>
          Dari warung sampai
          <br />
          <em>jaringan multi-outlet.</em>
        </h2>
        <p>
          Coba 14 hari gratis di Starter dan Pro, tanpa kartu kredit.
          Enterprise disesuaikan dengan skala bisnis Anda.
        </p>
      </div>

      <div className="lp-pricing-grid">
        {PLANS.map((plan) => (
          <article
            key={plan.name}
            className={`lp-plan${plan.featured ? " is-featured" : ""}`}
          >
            <span className="lp-plan__tag lp-mono">{plan.tag}</span>

            <div className="lp-plan__head">
              <h3>{plan.name}</h3>
              {plan.featured && <span className="lp-plan__flag">Paling banyak dipakai</span>}
            </div>
            <p className="lp-plan__target">{plan.target}</p>
            <p className="lp-plan__desc">{plan.description}</p>

            <div className="lp-plan__price">
              {plan.price === null ? (
                <strong>Custom</strong>
              ) : (
                <>
                  <span className="lp-plan__price-from">mulai</span>
                  <div className="lp-plan__price-row">
                    <strong className="lp-num">{fmt(plan.price)}</strong>
                    <span>/ bulan</span>
                  </div>
                </>
              )}
            </div>

            <Button
              href={plan.price === null ? "#kontak" : "/register"}
              variant={plan.featured ? "primary" : "secondary"}
              className="lp-plan__cta"
            >
              {plan.cta}
            </Button>

            <dl className="lp-plan__limits">
              {plan.limits.map((l) => (
                <div key={l.label}>
                  <dt>{l.label}</dt>
                  <dd className="lp-num">{l.value}</dd>
                </div>
              ))}
            </dl>

            <ul className="lp-plan__features">
              {plan.features.map((f) => (
                <li key={f.label} className={f.included ? "" : "is-excluded"}>
                  {f.included ? (
                    <Check size={15} strokeWidth={2.5} />
                  ) : (
                    <X size={15} strokeWidth={2.5} />
                  )}
                  {f.label}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <p className="lp-pricing-note">
        Harga belum termasuk PPN. Tanpa biaya setup. Berhenti kapan saja.
      </p>
    </Section>
  );
}
