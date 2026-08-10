import { ArrowRight } from "lucide-react";
import Section from "../layout/Section";
import Button from "../ui/Button";

export default function CtaSection() {
  return (
    <Section id="kontak" tone="dark" className="lp-cta-section">
      <div className="lp-cta">
        <div className="lp-cta__text">
          <h2>
            Mulai dari satu kasir.
            <br />
            <em>Tambah chatbot saat Anda siap.</em>
          </h2>
          <p>
            Kami bantu siapkan katalog produk, atur hak akses staf, dan
            hubungkan nomor WhatsApp bisnis Anda. Outlet pertama bisa mulai
            bertransaksi di hari yang sama.
          </p>
        </div>

        <div className="lp-cta__actions">
          <Button href="/login" className="lp-button--lg">
            Buka dashboard <ArrowRight size={16} />
          </Button>
          <Button
            href="mailto:halo@lecrion.id?subject=Permintaan%20demo%20Lecrion"
            variant="secondary"
            className="lp-button--lg"
          >
            Jadwalkan demo
          </Button>
        </div>
      </div>
    </Section>
  );
}
