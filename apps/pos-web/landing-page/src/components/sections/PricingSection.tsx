import { Check } from "lucide-react";
import { useState } from "react";
import Section from "../layout/Section";
import Button from "../ui/Button";

const PLANS = [
  {
    name: "Starter",
    monthly: 299_000,
    yearly: 249_000,
    description: "Satu outlet yang butuh kasir dan stok yang benar.",
    features: [
      "1 outlet, 3 pengguna",
      "Kasir POS & register shift",
      "Katalog, stok, dan supplier",
      "Laporan harian",
      "Dukungan email",
    ],
  },
  {
    name: "Growth",
    monthly: 699_000,
    yearly: 579_000,
    description: "Saat pelanggan mulai memesan lewat WhatsApp.",
    features: [
      "3 outlet, pengguna tanpa batas",
      "Semua fitur Starter",
      "Chatbot WhatsApp & dashboard percakapan",
      "Kitchen display & manajemen meja",
      "Cashflow, invoice, dan sinkronisasi realtime",
      "Dukungan prioritas",
    ],
    featured: true,
  },
  {
    name: "Scale",
    monthly: null,
    yearly: null,
    description: "Jaringan outlet dengan aturan operasional sendiri.",
    features: [
      "Outlet tanpa batas",
      "Permission tingkat lanjut",
      "Onboarding & migrasi data",
      "Integrasi khusus",
      "SLA dan kanal dukungan khusus",
    ],
  },
];

function fmt(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function PricingSection() {
  const [yearly, setYearly] = useState(false);

  return (
    <Section id="harga" tone="paper">
      <div className="lp-section-heading">
        <h2>
          Mulai dari kasir,
          <br />
          <em>naik saat outlet bertambah.</em>
        </h2>
        <p>Coba 14 hari tanpa kartu kredit. Tidak ada batas transaksi di semua paket.</p>
      </div>

      <div className="lp-billing" role="group" aria-label="Siklus tagihan">
        <button
          type="button"
          className={`lp-billing__btn${!yearly ? " is-active" : ""}`}
          onClick={() => setYearly(false)}
          aria-pressed={!yearly}
        >
          Bulanan
        </button>
        <button
          type="button"
          className={`lp-billing__btn${yearly ? " is-active" : ""}`}
          onClick={() => setYearly(true)}
          aria-pressed={yearly}
        >
          Tahunan
          <span className="lp-billing__save">−17%</span>
        </button>
      </div>

      <div className="lp-pricing-grid">
        {PLANS.map((plan) => {
          const price =
            plan.monthly === null ? null : yearly ? plan.yearly : plan.monthly;
          return (
            <article
              key={plan.name}
              className={`lp-plan${plan.featured ? " is-featured" : ""}`}
            >
              <div className="lp-plan__head">
                <h3>{plan.name}</h3>
                {plan.featured && <span className="lp-plan__flag">Paling banyak dipakai</span>}
              </div>

              <p className="lp-plan__desc">{plan.description}</p>

              <div className="lp-plan__price">
                {price === null ? (
                  <strong>Hubungi kami</strong>
                ) : (
                  <>
                    <strong className="lp-num">{fmt(price)}</strong>
                    <span>/ outlet / bulan</span>
                  </>
                )}
              </div>

              <Button
                href={plan.monthly === null ? "#kontak" : "/register"}
                variant={plan.featured ? "primary" : "secondary"}
                className="lp-plan__cta"
              >
                {plan.monthly === null ? "Bicara dengan kami" : "Coba 14 hari gratis"}
              </Button>

              <ul className="lp-plan__features">
                {plan.features.map((f) => (
                  <li key={f}>
                    <Check size={15} strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>

      <p className="lp-pricing-note">
        Harga belum termasuk PPN. Tanpa biaya setup. Berhenti kapan saja.
      </p>
    </Section>
  );
}
