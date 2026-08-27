import Section from "../layout/Section";

/**
 * Company profile.
 *
 * NOTE — the entries marked below are placeholders. I don't have the real
 * corporate details, and inventing them on a public page is worse than leaving
 * them obvious. Replace before launch:
 *   · legal entity name (PT ...)
 *   · year founded
 *   · registered address
 *   · support phone / WhatsApp number
 */

const PRINCIPLES = [
  {
    title: "Satu catatan, bukan banyak salinan",
    body: "Kasir, chatbot, dapur, dan laporan menulis serta membaca data yang sama. Tidak ada proses rekap yang bisa meleset.",
  },
  {
    title: "Dirancang untuk shift, bukan untuk demo",
    body: "Layar kasir dioptimalkan untuk antrean jam sibuk: sedikit klik, tetap jalan saat internet putus, dan aman dipakai staf baru.",
  },
  {
    title: "Data outlet tetap milik outlet",
    body: "Setiap toko terisolasi di level basis data dan akses. Ekspor data tersedia kapan saja, tanpa perlu meminta izin.",
  },
];

const FACTS = [
  { label: "Bidang", value: "Perangkat lunak operasional ritel & F&B" },
  { label: "Produk", value: "Lecrion POS, Lecrion Chatbot" },
  { label: "Model", value: "Langganan bulanan per paket (Starter, Pro, Enterprise)" },
  { label: "Wilayah layanan", value: "Indonesia" },
  { label: "Badan usaha", value: "Lengkapi sebelum rilis" },
  { label: "Berdiri", value: "Lengkapi sebelum rilis" },
];

export default function CompanySection() {
  return (
    <Section id="perusahaan" tone="light">
      <div className="lp-company">
        <div className="lp-company__lede">
          <h2>
            Lecrion membangun perangkat lunak{" "}
            <em>untuk bisnis yang melayani antrean.</em>
          </h2>
          <p>
            Kami menggarap satu masalah: operasional outlet terpecah di banyak
            alat yang tidak saling bicara. Produk kami menyatukan transaksi,
            stok, percakapan pelanggan, dan laporan dalam satu sistem yang bisa
            Anda coba langsung.
          </p>
        </div>

        <dl className="lp-company__facts">
          {FACTS.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="lp-principles">
        {PRINCIPLES.map((p, i) => (
          <article className="lp-principle" key={p.title}>
            <span className="lp-principle__num lp-mono">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3>{p.title}</h3>
            <p>{p.body}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}
