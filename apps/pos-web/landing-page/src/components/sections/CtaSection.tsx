import { ArrowRight, MessageSquareText } from "lucide-react";
import Section from "../layout/Section";
import Button from "../ui/Button";

export default function CtaSection() {
  return (
    <Section id="contact" className="lp-cta-section">
      <div className="lp-cta-panel">
        <div>
          <span className="lp-kicker">Demo</span>
          <h2>Lihat Lecrion sebagai sistem operasional, bukan mockup.</h2>
          <p>Mulai dari kasir, stok, order WhatsApp, sampai laporan owner dalam satu alur yang bisa diuji.</p>
        </div>
        <div className="lp-cta-actions">
          <Button href="/login">Buka POS <ArrowRight size={18} /></Button>
          <Button href="mailto:hello@lecrion.local" variant="secondary">
            <MessageSquareText size={18} /> Minta demo
          </Button>
        </div>
      </div>
    </Section>
  );
}
