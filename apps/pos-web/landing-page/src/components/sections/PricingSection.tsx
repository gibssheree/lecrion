import { useState } from "react";
import Section from "../layout/Section";
import Button from "../ui/Button";

const PLANS = [
  {
    name: "Starter",
    monthly: 299_000,
    yearly: 249_000,
    description: "Untuk outlet kecil yang butuh kasir dan stok dasar.",
    features: [
      "1 outlet",
      "POS kasir & register shift",
      "Inventory dasar",
      "Laporan harian",
      "Support email",
    ],
  },
  {
    name: "Growth",
    monthly: 699_000,
    yearly: 579_000,
    description: "Untuk bisnis yang mulai memakai WhatsApp dan multi-role.",
    features: [
      "Multi-user & role",
      "WhatsApp bot",
      "Cashflow & invoice",
      "KDS F&B",
      "Realtime sync",
      "Loyalty & promo",
    ],
    featured: true,
  },
  {
    name: "Scale",
    monthly: null,
    yearly: null,
    description: "Untuk multi-outlet dengan workflow yang lebih dalam.",
    features: [
      "Multi-outlet",
      "Permission advanced",
      "Dedicated onboarding",
      "Integrasi khusus",
      "SLA support",
    ],
  },
];

function fmt(n: number) {
  return "Rp " + (n / 1000).toFixed(0) + "rb";
}

export default function PricingSection() {
  const [yearly, setYearly] = useState(false);

  return (
    <Section id="pricing" tone="light">
      <div className="lp-section-heading">
        <span>Harga</span>
        <h2>
          Mulai dari kasir,
          <br />
          <em>tambah saat outlet berkembang.</em>
        </h2>
        <p>Semua paket bisa dicoba 14 hari tanpa kartu kredit.</p>
      </div>

      <div
        className="lp-billing-toggle"
        role="group"
        aria-label="Pilih siklus tagihan"
      >
        <button
          type="button"
          className={`lp-billing-btn${!yearly ? " is-active" : ""}`}
          onClick={() => setYearly(false)}
          aria-pressed={!yearly}
        >
          Bulanan
        </button>
        <button
          type="button"
          className={`lp-billing-btn${yearly ? " is-active" : ""}`}
          onClick={() => setYearly(true)}
          aria-pressed={yearly}
        >
          Tahunan
          <span className="lp-billing-save">Hemat 17%</span>
        </button>
      </div>

      <div className="lp-pricing-grid">
        {PLANS.map((plan) => {
          const price =
            plan.monthly === null ? null : yearly ? plan.yearly : plan.monthly;
          return (
            <article
              key={plan.name}
              className={`lp-pricing-card${plan.featured ? " is-featured" : ""}`}
            >
              {plan.featured && (
                <span className="lp-pricing-flag">Populer</span>
              )}
              <h3>{plan.name}</h3>
              <p>{plan.description}</p>
              <strong className="lp-price">
                {price === null ? "Custom" : fmt(price)}
                {price !== null && <small> / bulan</small>}
              </strong>
              <ul>
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Button
                href={plan.monthly === null ? "#contact" : "/register"}
                variant={plan.featured ? "primary" : "secondary"}
              >
                {plan.monthly === null ? "Hubungi kami" : "Coba gratis 14 hari"}
              </Button>
            </article>
          );
        })}
      </div>

      <p className="lp-pricing-note">
        Belum termasuk PPN. Tidak ada biaya setup. Batalkan kapan saja.
      </p>
    </Section>
  );
}
