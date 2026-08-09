import LegalPageLayout from "./LegalPageLayout";

const TOC = [
  { id: "pendahuluan", label: "Pendahuluan" },
  { id: "data-dikumpulkan", label: "Data yang Dikumpulkan" },
  { id: "penggunaan-data", label: "Penggunaan Data" },
  { id: "dasar-pemrosesan", label: "Dasar Pemrosesan" },
  { id: "berbagi-data", label: "Berbagi Data" },
  { id: "keamanan", label: "Keamanan & Penyimpanan" },
  { id: "hak-anda", label: "Hak Anda" },
  { id: "retensi", label: "Retensi Data" },
  { id: "anak", label: "Data Anak" },
  { id: "cookie", label: "Cookie" },
  { id: "perubahan", label: "Perubahan Kebijakan" },
  { id: "kontak", label: "Kontak" },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title="Kebijakan Privasi" updatedAt="9 Agustus 2026" toc={TOC}>
      <h2 id="pendahuluan">1. Pendahuluan</h2>
      <p>
        Lecrion ("kami") menyediakan platform point-of-sale (POS) berbasis cloud
        beserta layanan pendukungnya, termasuk asisten WhatsApp dan asisten AI, untuk
        membantu pelaku usaha mengelola penjualan, inventori, dan operasional bisnis
        mereka ("Layanan"). Kebijakan Privasi ini menjelaskan bagaimana kami
        mengumpulkan, menggunakan, membagikan, dan melindungi informasi saat Anda
        menggunakan Layanan.
      </p>
      <p>
        Dengan mendaftar atau menggunakan Layanan, Anda menyetujui pengumpulan dan
        penggunaan informasi sebagaimana dijelaskan dalam kebijakan ini.
      </p>

      <h2 id="data-dikumpulkan">2. Data yang Dikumpulkan</h2>
      <h3>2.1 Data yang Anda berikan langsung</h3>
      <ul>
        <li><strong>Data akun</strong> — nama, alamat email, nomor telepon, kata sandi (disimpan terenkripsi), dan peran pengguna (owner, manager, kasir, dll).</li>
        <li><strong>Data bisnis</strong> — nama toko, kategori/jenis usaha, alamat, dan pengaturan pajak/biaya layanan.</li>
        <li><strong>Data transaksi</strong> — katalog produk, harga, stok, penjualan, pembayaran, invoice, dan arus kas yang Anda input ke dalam sistem.</li>
        <li><strong>Data pelanggan Anda</strong> — jika Anda mencatat data pelanggan (nama, nomor WhatsApp, riwayat pembelian) untuk keperluan operasional toko Anda.</li>
      </ul>
      <h3>2.2 Data yang dikumpulkan secara otomatis</h3>
      <ul>
        <li>Log teknis — alamat IP, jenis perangkat/browser, waktu akses, dan aktivitas dalam aplikasi (audit log) untuk keperluan keamanan dan pencegahan kecurangan.</li>
        <li>Data penggunaan fitur — halaman yang diakses dan interaksi dengan fitur, untuk meningkatkan kualitas Layanan.</li>
      </ul>
      <h3>2.3 Data melalui saluran WhatsApp</h3>
      <p>
        Jika toko Anda mengaktifkan asisten WhatsApp, pesan yang dikirim oleh pelanggan
        Anda ke nomor WhatsApp bisnis Anda (pertanyaan, pesanan, isi percakapan) akan
        diproses oleh sistem kami untuk menghasilkan balasan otomatis dan dicatat
        sebagai riwayat percakapan yang dapat Anda lihat di dashboard.
      </p>

      <h2 id="penggunaan-data">3. Penggunaan Data</h2>
      <p>Kami menggunakan data yang dikumpulkan untuk:</p>
      <ul>
        <li>Menyediakan, mengoperasikan, dan memelihara Layanan (transaksi, laporan, notifikasi stok, dll).</li>
        <li>Memproses percakapan WhatsApp dan menghasilkan respons melalui asisten AI.</li>
        <li>Mencegah penyalahgunaan, kecurangan transaksi, dan pelanggaran keamanan.</li>
        <li>Memberikan dukungan pelanggan dan menanggapi pertanyaan Anda.</li>
        <li>Mengirim pemberitahuan operasional penting (contoh: stok menipis, jadwal maintenance).</li>
        <li>Meningkatkan dan mengembangkan fitur Layanan.</li>
        <li>Memenuhi kewajiban hukum yang berlaku.</li>
      </ul>

      <h2 id="dasar-pemrosesan">4. Dasar Pemrosesan Data</h2>
      <p>
        Kami memproses data Anda berdasarkan: (a) pelaksanaan kontrak layanan antara
        Anda dan Lecrion, (b) kepentingan sah kami dalam mengoperasikan dan mengamankan
        Layanan, (c) persetujuan Anda untuk fitur opsional tertentu, dan (d) kepatuhan
        terhadap kewajiban hukum yang berlaku di Indonesia.
      </p>

      <h2 id="berbagi-data">5. Berbagi Data ke Pihak Ketiga</h2>
      <p>
        Kami tidak menjual data pribadi Anda. Data dapat dibagikan secara terbatas kepada:
      </p>
      <ul>
        <li><strong>Penyedia saluran WhatsApp</strong> (mis. Fonnte) — untuk mengirim dan menerima pesan WhatsApp atas nama toko Anda.</li>
        <li><strong>Penyedia layanan AI</strong> (mis. Google Gemini) — untuk memproses permintaan bahasa alami dan menghasilkan balasan/analisis otomatis.</li>
        <li><strong>Penyedia infrastruktur cloud dan hosting</strong> — untuk menyimpan dan menjalankan sistem secara aman.</li>
        <li><strong>Penyedia layanan pembayaran</strong> — apabila Anda berlangganan paket berbayar, untuk memproses transaksi pembayaran langganan.</li>
        <li><strong>Otoritas yang berwenang</strong> — apabila diwajibkan oleh hukum yang berlaku, perintah pengadilan, atau proses hukum lainnya.</li>
      </ul>
      <p>
        Pihak ketiga tersebut hanya menerima data yang diperlukan untuk menjalankan
        fungsinya dan terikat kewajiban menjaga kerahasiaan data.
      </p>

      <h2 id="keamanan">6. Keamanan & Penyimpanan Data</h2>
      <p>
        Kami menerapkan langkah-langkah teknis dan organisasi yang wajar untuk
        melindungi data Anda, termasuk enkripsi kata sandi, kontrol akses berbasis
        peran, dan pencatatan audit atas perubahan data penting. Meskipun demikian,
        tidak ada sistem transmisi atau penyimpanan data melalui internet yang 100%
        aman, sehingga kami tidak dapat menjamin keamanan mutlak.
      </p>

      <h2 id="hak-anda">7. Hak Anda atas Data Pribadi</h2>
      <p>Sesuai peraturan perlindungan data pribadi yang berlaku, Anda berhak untuk:</p>
      <ul>
        <li>Mengakses dan meminta salinan data pribadi yang kami simpan tentang Anda.</li>
        <li>Meminta koreksi atas data yang tidak akurat atau tidak lengkap.</li>
        <li>Meminta penghapusan data pribadi Anda, sepanjang tidak bertentangan dengan kewajiban hukum kami untuk menyimpannya.</li>
        <li>Menarik persetujuan Anda atas pemrosesan data yang bersifat opsional.</li>
        <li>Mengajukan keberatan atas pemrosesan data tertentu.</li>
      </ul>
      <p>
        Untuk menggunakan hak-hak ini, silakan hubungi kami melalui kontak pada bagian
        12 di bawah.
      </p>

      <h2 id="retensi">8. Retensi Data</h2>
      <p>
        Kami menyimpan data Anda selama akun Anda aktif atau selama diperlukan untuk
        menyediakan Layanan. Setelah akun ditutup, kami dapat menyimpan sebagian data
        (mis. data transaksi dan audit log) untuk memenuhi kewajiban hukum, akuntansi,
        atau pajak, sesuai jangka waktu yang diwajibkan peraturan yang berlaku.
      </p>

      <h2 id="anak">9. Data Anak-anak</h2>
      <p>
        Layanan ini ditujukan untuk pelaku usaha dan bukan untuk digunakan oleh anak di
        bawah usia 18 tahun. Kami tidak dengan sengaja mengumpulkan data pribadi dari
        anak-anak.
      </p>

      <h2 id="cookie">10. Cookie dan Teknologi Pelacakan</h2>
      <p>
        Kami menggunakan cookie dan teknologi penyimpanan lokal browser (local/session
        storage) yang bersifat esensial untuk menjaga sesi login Anda tetap aktif dan
        untuk keperluan keamanan. Anda dapat mengatur browser untuk menolak cookie,
        namun sebagian fitur Layanan mungkin tidak berfungsi dengan baik.
      </p>

      <h2 id="perubahan">11. Perubahan Kebijakan Privasi</h2>
      <p>
        Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Perubahan
        material akan kami beritahukan melalui aplikasi atau email terdaftar Anda.
        Tanggal "Terakhir diperbarui" di bagian atas halaman ini menunjukkan revisi
        terbaru.
      </p>

      <h2 id="kontak">12. Hubungi Kami</h2>
      <p>
        Jika Anda memiliki pertanyaan mengenai Kebijakan Privasi ini atau ingin
        menggunakan hak Anda atas data pribadi, silakan hubungi kami di{" "}
        <a href="mailto:privacy@lecrion.com">privacy@lecrion.com</a>.
      </p>
    </LegalPageLayout>
  );
}
