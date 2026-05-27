import Section from "../layout/Section";

const FAQS = [
  {
    q: "Berapa lama setup awal?",
    a: "Outlet bisa mulai dipakai untuk transaksi dalam hitungan jam. Bot WhatsApp dan integrasi lain ditambahkan bertahap sesuai kebutuhan.",
  },
  {
    q: "Apakah cocok untuk F&B?",
    a: "Ya. Lecrion punya KDS, table management, kitchen ticket, dan order WhatsApp yang dirancang spesifik untuk operasional cafe dan resto.",
  },
  {
    q: "Apakah bisa offline?",
    a: "Kasir tetap bisa transaksi saat koneksi terputus. Data tersimpan lokal dan otomatis tersinkron saat online kembali.",
  },
  {
    q: "Apakah ada batasan transaksi?",
    a: "Tidak ada. Semua paket bebas batas transaksi. Yang membedakan adalah jumlah outlet, user, dan modul yang aktif.",
  },
  {
    q: "Bagaimana data outlet saya?",
    a: "Setiap toko terisolasi penuh di level database, realtime, dan akses. Backup harian otomatis untuk semua paket.",
  },
  {
    q: "Apakah landing dan POS satu aplikasi?",
    a: "Untuk pengguna ya — landing hidup di domain yang sama dengan POS. Klik Buka POS langsung masuk ke sistem.",
  },
];

export default function FaqSection() {
  return (
    <Section tone="light">
      <div className="lp-section-heading">
        <span>FAQ</span>
        <h2>
          Pertanyaan umum
          <br />
          <em>sebelum demo.</em>
        </h2>
      </div>

      <div className="lp-faq-list">
        {FAQS.map((item) => (
          <details className="lp-faq-item" key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
