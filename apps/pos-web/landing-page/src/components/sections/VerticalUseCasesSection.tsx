import Section from "../layout/Section";

const VERTICALS = [
  {
    title: "Cafe & resto",
    description:
      "Kasir, dapur, order WhatsApp, dan stok bahan baku dalam satu alur.",
    modules: ["KDS", "Meja", "Resep", "Chatbot"],
  },
  {
    title: "Retail",
    description:
      "Transaksi cepat dengan barcode, varian produk, dan kartu stok rapi.",
    modules: ["Barcode", "Varian", "Opname"],
  },
  {
    title: "Multi-cabang",
    description:
      "Owner membaca performa tiap outlet dan memindahkan stok antar lokasi.",
    modules: ["Multi-outlet", "Transfer", "Laporan"],
  },
  {
    title: "Laundry & jasa",
    description:
      "Order, invoice, pembayaran, dan status pengerjaan terpantau per pelanggan.",
    modules: ["Invoice", "Pelanggan", "Status"],
  },
];

export default function VerticalUseCasesSection() {
  return (
    <Section id="solusi" tone="paper">
      <div className="lp-section-heading">
        <h2>
          Satu platform,
          <br />
          <em>dikonfigurasi per jenis usaha.</em>
        </h2>
      </div>

      <div className="lp-vertical-grid">
        {VERTICALS.map((v) => (
          <article className="lp-vertical-card" key={v.title}>
            <h3>{v.title}</h3>
            <p>{v.description}</p>
            <div className="lp-vertical-card__tags">
              {v.modules.map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}
