import Section from "../layout/Section";

// A capability index, mirroring the service modules that actually ship.
const GROUPS = [
  {
    title: "Penjualan",
    items: [
      "Kasir POS",
      "Register & shift",
      "Split payment",
      "Void & refund",
      "Pemindai barcode",
      "Retur penjualan",
    ],
  },
  {
    title: "Katalog & stok",
    items: [
      "Produk & varian",
      "Kategori & modifier",
      "Supplier & PO",
      "Mutasi antar lokasi",
      "Transfer stok",
      "Stock opname",
    ],
  },
  {
    title: "Chatbot & AI",
    items: [
      "Bot WhatsApp",
      "Deteksi intent",
      "Konsol LLM",
      "Live feed percakapan",
      "Balasan terkurasi",
      "Eskalasi ke manusia",
    ],
  },
  {
    title: "F&B",
    items: [
      "Kitchen display",
      "Manajemen meja",
      "Tiket dapur",
      "Resep & bahan baku",
      "Pengurangan bahan otomatis",
      "Dine in & takeaway",
    ],
  },
  {
    title: "Keuangan",
    items: [
      "Kas masuk & keluar",
      "Invoice",
      "Metode pembayaran",
      "Rekap shift",
      "Laporan penjualan",
      "Laporan stok",
    ],
  },
  {
    title: "Kontrol & keamanan",
    items: [
      "Multi-outlet",
      "Role & permission",
      "Jejak audit",
      "Sinkronisasi realtime",
      "Mode offline",
      "Isolasi data per toko",
    ],
  },
];

export default function ModulesSection() {
  return (
    <Section tone="light">
      <div className="lp-section-heading">
        <h2>
          Kemampuan yang sudah
          <br />
          <em>bisa dipakai hari ini.</em>
        </h2>
        <p>
          Modul aktif menyesuaikan paket dan jenis usaha Anda. Yang tidak
          relevan tidak ditampilkan ke staf.
        </p>
      </div>

      <div className="lp-modules">
        {GROUPS.map((group) => (
          <div className="lp-module" key={group.title}>
            <h3>{group.title}</h3>
            <ul>
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}
