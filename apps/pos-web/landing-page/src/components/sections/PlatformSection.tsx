import Section from "../layout/Section";

const LAYERS = [
  {
    step: "01",
    title: "Titik masuk",
    items: ["Chatbot WhatsApp", "Kasir POS", "Dashboard owner", "Kitchen display"],
  },
  {
    step: "02",
    title: "Inti transaksi",
    items: ["Order & pembayaran", "Register & shift", "Stok dan mutasi", "Kas dan invoice"],
  },
  {
    step: "03",
    title: "Yang keluar",
    items: ["Laporan realtime", "Jejak audit", "Kartu stok", "Rekap per outlet"],
  },
];

const CONTRAST = [
  {
    kicker: "Tanpa sistem tunggal",
    tone: "before" as const,
    points: [
      "Order chat disalin ulang ke kasir.",
      "Stok baru ketahuan habis setelah pelanggan menunggu.",
      "Owner menunggu rekap manual tutup toko.",
      "Angka kasir, dapur, dan laporan berbeda.",
    ],
  },
  {
    kicker: "Dengan Lecrion",
    tone: "after" as const,
    points: [
      "Order chat langsung jadi order kasir.",
      "Stok berkurang di detik transaksi tercatat.",
      "Owner membaca performa tanpa menunggu.",
      "Satu angka, satu sumber kebenaran.",
    ],
  },
];

export default function PlatformSection() {
  return (
    <Section id="platform" tone="paper" wide>
      <div className="lp-section-heading">
        <h2>
          Satu inti transaksi,
          <br />
          <em>dipakai semua titik masuk.</em>
        </h2>
        <p>
          Semua titik masuk menulis ke inti transaksi yang sama. Itu sebabnya
          laporan tidak perlu dicocokkan, karena dibaca langsung dari catatan
          aslinya.
        </p>
      </div>

      <div className="lp-layers">
        {LAYERS.map((layer) => (
          <div className="lp-layer" key={layer.step}>
            <span className="lp-layer__step lp-mono">{layer.step}</span>
            <h3>{layer.title}</h3>
            <ul>
              {layer.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="lp-contrast">
        {CONTRAST.map((col) => (
          <div className={`lp-contrast__col is-${col.tone}`} key={col.kicker}>
            <h3 className="lp-contrast__label">{col.kicker}</h3>
            <ul>
              {col.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}
