import Section from "../layout/Section";

const FAQS = [
  {
    q: "Berapa lama sampai outlet bisa transaksi?",
    a: "Kasir bisa dipakai di hari yang sama setelah katalog produk masuk. Chatbot WhatsApp, kitchen display, dan modul lain menyusul bertahap sesuai kesiapan tim Anda.",
  },
  {
    q: "Kalau internet outlet mati, kasir berhenti?",
    a: "Tidak. Transaksi tetap berjalan dan tersimpan di perangkat, lalu tersinkron otomatis begitu koneksi kembali. Chatbot memerlukan koneksi karena berjalan di sisi server.",
  },
  {
    q: "Apakah chatbot bisa salah membaca pesanan?",
    a: "Bisa, seperti semua sistem berbasis bahasa. Karena itu setiap percakapan tampil di dashboard beserta intent dan tingkat keyakinannya, dan staf bisa mengambil alih percakapan kapan saja sebelum order dikonfirmasi.",
  },
  {
    q: "Apakah ada batas jumlah transaksi?",
    a: "Tidak ada. Yang membedakan paket adalah jumlah outlet, pengguna, dan modul yang aktif, bukan volume penjualan Anda.",
  },
  {
    q: "Bagaimana keamanan dan kepemilikan data?",
    a: "Data tiap toko terisolasi di level basis data dan hak akses, dengan jejak audit untuk aksi sensitif seperti void, refund, dan perubahan harga. Data tetap milik Anda dan bisa diekspor kapan saja.",
  },
  {
    q: "Bisa pindah dari sistem POS yang sekarang?",
    a: "Bisa. Produk, kategori, dan stok awal dapat diimpor dari CSV atau XLSX. Untuk paket Scale, migrasi dibantu tim kami.",
  },
];

export default function FaqSection() {
  return (
    <Section tone="light">
      <div className="lp-faq">
        <div className="lp-faq__aside">
          <h2>
            Pertanyaan yang
            <br />
            <em>selalu muncul.</em>
          </h2>
          <p>
            Ada yang belum terjawab?{" "}
            <a className="lp-link" href="#kontak">
              Tanyakan langsung
            </a>
            .
          </p>
        </div>

        <div className="lp-faq__list">
          {FAQS.map((item) => (
            <details className="lp-faq__item" key={item.q}>
              <summary>
                {item.q}
                <span className="lp-faq__icon" aria-hidden="true" />
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}
