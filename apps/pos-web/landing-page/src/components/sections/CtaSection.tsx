import { ArrowRight } from "lucide-react";
import Section from "../layout/Section";
import Button from "../ui/Button";

export default function CtaSection() {
  return (
    <Section id="contact" className="lp-cta-section">
      <div className="lp-cta-panel">
        <div>
          <h2>
            Lihat Lecrion sebagai sistem,
            <br />
            bukan mockup.
          </h2>
          <p>
            Mulai dari kasir, stok, order WhatsApp, sampai laporan owner dalam
            satu alur yang bisa diuji langsung.
          </p>
        </div>
        <div className="lp-cta-actions">
          <Button href="/login">
            Buka POS <ArrowRight size={15} />
          </Button>
          <Button href="mailto:hello@lecrion.id" variant="secondary">
            Minta demo
          </Button>
        </div>
      </div>
    </Section>
  );
}
