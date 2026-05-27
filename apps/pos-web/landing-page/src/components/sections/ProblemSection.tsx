import Section from "../layout/Section";

export default function ProblemSection() {
  return (
    <Section tone="paper">
      <div className="lp-problem-grid">
        <div className="lp-problem-col">
          <span className="lp-kicker">Sebelum Lecrion</span>
          <h3>Operasional bocor saat sistemnya terpisah.</h3>
          <ul>
            <li>Order chat tidak nyambung ke kasir.</li>
            <li>Stok baru ketahuan habis setelah pelanggan menunggu.</li>
            <li>Owner menunggu rekap manual akhir hari.</li>
            <li>Laporan dari kasir, dapur, dan dashboard berbeda angkanya.</li>
          </ul>
        </div>

        <div className="lp-problem-col">
          <span className="lp-kicker">Dengan Lecrion</span>
          <h3>Satu alur dari transaksi sampai laporan.</h3>
          <ul>
            <li>Kasir, bot, stok, dan laporan baca data yang sama.</li>
            <li>Staff melihat tugas sesuai role tanpa training panjang.</li>
            <li>Owner cek performa tanpa menunggu rekap.</li>
            <li>Setiap angka punya satu sumber kebenaran.</li>
          </ul>
        </div>
      </div>
    </Section>
  );
}
