import Section from "../layout/Section";

const VERTICALS = [
  {
    title: "Cafe dan resto",
    description:
      "Kasir, dapur, order WhatsApp, dan stok bahan dalam satu alur.",
  },
  {
    title: "Retail kecil",
    description:
      "Transaksi cepat, stok terpantau, dan laporan harian mudah dibaca.",
  },
  {
    title: "Booth multi-cabang",
    description:
      "Owner melihat performa setiap outlet tanpa menunggu rekap manual.",
  },
  {
    title: "Laundry dan jasa",
    description: "Order, invoice, pembayaran, dan status pekerjaan terpantau.",
  },
];

export default function VerticalUseCasesSection() {
  return (
    <Section tone="light">
      <div className="lp-section-heading">
        <span>Use case</span>
        <h2>
          Cocok untuk bisnis yang
          <br />
          <em>butuh transaksi dan kontrol outlet.</em>
        </h2>
      </div>
      <div className="lp-vertical-grid">
        {VERTICALS.map((v) => (
          <article className="lp-vertical-card" key={v.title}>
            <h3>{v.title}</h3>
            <p>{v.description}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}
