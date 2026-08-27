import { ArrowRight } from "lucide-react";
import Button from "../ui/Button";

/**
 * The glass dashboard below is illustrative — same convention as the POS and
 * chatbot mocks in ProductSurfacesSection: real layout and copy voice, fictional
 * numbers, clearly a mock rather than a live embed (no user's real data
 * could appear here). The AI line names a concrete, real mechanism (register
 * variance + manager approval on refunds — see PlatformSection's contrast
 * block and the actual approval workflow in the product) rather than a vague
 * claim, so it doesn't overstate what "AI Owner Assistant" does today.
 */
export default function HeroSection() {
  return (
    <section className="lp-hero" aria-labelledby="lp-hero-title">
      <div className="lp-hero__inner">
        <h1 id="lp-hero-title">
          Sistem operasi outlet dengan <span className="lp-grad">otak AI</span> di
          dalamnya.
        </h1>

        <p className="lp-hero__sub">
          Kasir, stok, dan chatbot WhatsApp berjalan di atas satu basis data
          yang sama, diawasi AI Owner Assistant yang membaca transaksi
          aslinya, bukan rekap yang disusun ulang.
        </p>

        <div className="lp-hero__actions">
          <Button href="/register" className="lp-button--lg">
            Coba 14 Hari Gratis <ArrowRight size={16} />
          </Button>
          <Button href="#kontak" variant="secondary" className="lp-button--lg">
            Jadwalkan demo
          </Button>
        </div>

        <div className="lp-hero__panel" aria-hidden="true">
          <div className="lp-hero__panel-inner">
            <div className="lp-hero__panel-top">
              <span className="lp-hero__panel-label lp-mono">
                lecrion://dashboard/owner
              </span>
              <span className="lp-hero__panel-live">
                <i className="lp-dot" />
                LIVE
              </span>
            </div>

            <div className="lp-hero__stats">
              <div className="lp-hero__stat">
                <div className="lp-hero__stat-label">Omzet hari ini</div>
                <div className="lp-hero__stat-value is-cyan lp-num">Rp 16,3 jt</div>
              </div>
              <div className="lp-hero__stat">
                <div className="lp-hero__stat-label">Transaksi</div>
                <div className="lp-hero__stat-value lp-num">207</div>
              </div>
              <div className="lp-hero__stat">
                <div className="lp-hero__stat-label">Anomali terdeteksi</div>
                <div className="lp-hero__stat-value is-violet lp-num">1</div>
              </div>
            </div>

            <div className="lp-hero__ai">
              <span className="lp-hero__ai-icon">&#10022;</span>
              <p>
                <strong>AI Owner Assistant:</strong> &ldquo;Selisih kas Rp 20.000 di
                shift malam &mdash; refund jam 21:12 belum ada approval manajer.
                Perlu ditinjau?&rdquo;
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
