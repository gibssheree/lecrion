import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import Section from "../layout/Section";

export default function ProblemSection() {
  return (
    <Section className="lp-problem-section" tone="soft">
      <div className="lp-problem-grid">
        <div>
          <span className="lp-kicker">Masalah lama</span>
          <h2>Operasional bocor saat sistemnya terpisah.</h2>
          <ul>
            <li><XCircle size={18} />Order chat tidak nyambung ke kasir.</li>
            <li><XCircle size={18} />Stok baru ketahuan habis setelah pelanggan menunggu.</li>
            <li><XCircle size={18} />Owner menunggu rekap manual akhir hari.</li>
          </ul>
        </div>
        <ArrowRight className="lp-problem-arrow" size={34} />
        <div>
          <span className="lp-kicker">Dengan Lecrion</span>
          <h2>Satu alur dari transaksi sampai laporan.</h2>
          <ul>
            <li><CheckCircle2 size={18} />Kasir, bot, stok, dan laporan membaca data yang sama.</li>
            <li><CheckCircle2 size={18} />Staff melihat tugas sesuai role.</li>
            <li><CheckCircle2 size={18} />Owner bisa cek performa tanpa menunggu rekap.</li>
          </ul>
        </div>
      </div>
    </Section>
  );
}
