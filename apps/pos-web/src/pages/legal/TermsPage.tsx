import LegalPageLayout from "./LegalPageLayout";

const TOC = [
  { id: "penerimaan", label: "Penerimaan Syarat" },
  { id: "layanan", label: "Deskripsi Layanan" },
  { id: "akun", label: "Akun Pengguna" },
  { id: "peran", label: "Peran & Tanggung Jawab" },
  { id: "biaya", label: "Biaya & Pembayaran" },
  { id: "larangan", label: "Penggunaan Terlarang" },
  { id: "data-pengguna", label: "Data & Konten Anda" },
  { id: "pihak-ketiga", label: "Integrasi Pihak Ketiga" },
  { id: "ki", label: "Kekayaan Intelektual" },
  { id: "tanggung-jawab", label: "Batasan Tanggung Jawab" },
  { id: "penangguhan", label: "Penangguhan & Penghentian" },
  { id: "perubahan-layanan", label: "Perubahan Layanan" },
  { id: "hukum", label: "Hukum yang Berlaku" },
  { id: "lain", label: "Ketentuan Lain" },
  { id: "kontak", label: "Kontak" },
];

export default function TermsPage() {
  return (
    <LegalPageLayout title="Syarat & Ketentuan" updatedAt="9 Agustus 2026" toc={TOC}>
      <h2 id="penerimaan">1. Penerimaan Syarat</h2>
      <p>
        Syarat &amp; Ketentuan ini ("Syarat") mengatur penggunaan Anda atas platform
        Lecrion, termasuk aplikasi point-of-sale (POS), dashboard admin, asisten
        WhatsApp, dan fitur AI terkait (secara bersama disebut "Layanan") yang
        disediakan oleh Lecrion ("kami"). Dengan membuat akun, mendaftarkan bisnis,
        atau menggunakan Layanan, Anda menyatakan telah membaca, memahami, dan
        menyetujui untuk terikat oleh Syarat ini.
      </p>
      <p>
        Jika Anda mendaftar atas nama suatu badan usaha, Anda menyatakan memiliki
        wewenang untuk mengikat badan usaha tersebut pada Syarat ini.
      </p>

      <h2 id="layanan">2. Deskripsi Layanan</h2>
      <p>
        Lecrion adalah platform SaaS (Software-as-a-Service) yang menyediakan alat
        kasir/POS, manajemen inventori dan katalog produk, pencatatan arus kas dan
        invoice, laporan penjualan, serta asisten percakapan berbasis WhatsApp dan AI
        untuk membantu pemilik bisnis mengelola operasional tokonya. Fitur yang
        tersedia dapat berbeda tergantung jenis usaha (vertical bisnis) dan paket
        langganan yang dipilih.
      </p>

      <h2 id="akun">3. Akun Pengguna</h2>
      <ul>
        <li>Anda wajib memberikan informasi pendaftaran yang akurat dan menjaga kerahasiaan kata sandi akun Anda.</li>
        <li>Anda bertanggung jawab atas seluruh aktivitas yang terjadi melalui akun Anda, termasuk akun staf (manager, kasir) yang Anda buat di bawah toko Anda.</li>
        <li>Segera beri tahu kami apabila Anda menduga terjadi akses tidak sah ke akun Anda.</li>
        <li>Kami berhak menolak pendaftaran atau menonaktifkan akun yang memberikan informasi palsu atau menyalahgunakan Layanan.</li>
      </ul>

      <h2 id="peran">4. Peran & Tanggung Jawab Pengguna</h2>
      <p>
        Layanan mendukung beberapa peran pengguna dalam satu toko (owner, manager,
        kasir/operator, staf inventori). Pemilik akun ("Owner") bertanggung jawab
        penuh atas pengaturan hak akses staf yang diundang ke dalam tokonya, termasuk
        data apa saja yang dapat mereka lihat dan ubah. Kami tidak bertanggung jawab
        atas kerugian yang timbul akibat pemberian hak akses yang tidak tepat oleh
        Owner kepada stafnya.
      </p>

      <h2 id="biaya">5. Biaya, Uji Coba, dan Pembayaran</h2>
      <ul>
        <li>Sebagian fitur Layanan dapat digunakan melalui periode uji coba gratis dengan durasi tertentu.</li>
        <li>Setelah masa uji coba berakhir atau untuk fitur berbayar, Anda wajib berlangganan salah satu paket yang tersedia dan membayar biaya sesuai paket tersebut.</li>
        <li>Biaya langganan bersifat tidak dapat dikembalikan (non-refundable), kecuali ditentukan lain oleh kami atau diwajibkan oleh hukum yang berlaku.</li>
        <li>Kami berhak mengubah struktur harga dengan pemberitahuan terlebih dahulu sebelum perubahan berlaku bagi pelanggan yang sudah ada.</li>
        <li>Keterlambatan atau kegagalan pembayaran dapat mengakibatkan penangguhan akses ke Layanan.</li>
      </ul>

      <h2 id="larangan">6. Penggunaan Terlarang</h2>
      <p>Anda setuju untuk tidak:</p>
      <ul>
        <li>Menggunakan Layanan untuk aktivitas ilegal, penipuan, atau pencucian uang.</li>
        <li>Mencoba mengakses data toko lain tanpa otorisasi, atau mengeksploitasi celah keamanan sistem.</li>
        <li>Melakukan rekayasa balik (reverse engineering), menyalin, atau mendistribusikan ulang perangkat lunak Layanan.</li>
        <li>Mengirim pesan WhatsApp yang bersifat spam, menyesatkan, atau melanggar kebijakan penyedia saluran WhatsApp.</li>
        <li>Mengunggah data yang melanggar hak kekayaan intelektual atau privasi pihak lain.</li>
        <li>Membebani sistem secara berlebihan (mis. automated scraping) yang dapat mengganggu ketersediaan Layanan bagi pengguna lain.</li>
      </ul>

      <h2 id="data-pengguna">7. Data & Konten Anda</h2>
      <p>
        Seluruh data bisnis yang Anda masukkan ke dalam sistem (produk, transaksi,
        data pelanggan Anda, dll.) tetap menjadi milik Anda. Anda memberikan kami
        lisensi terbatas untuk menyimpan, memproses, dan menampilkan data tersebut
        semata-mata untuk menjalankan dan meningkatkan Layanan bagi Anda. Lihat{" "}
        <a href="/kebijakan-privasi" target="_blank" rel="noopener noreferrer">
          Kebijakan Privasi
        </a>{" "}
        kami untuk detail lebih lanjut mengenai pemrosesan data.
      </p>

      <h2 id="pihak-ketiga">8. Integrasi Pihak Ketiga</h2>
      <p>
        Layanan terintegrasi dengan penyedia pihak ketiga, termasuk namun tidak
        terbatas pada penyedia saluran pesan WhatsApp dan penyedia model AI generatif.
        Ketersediaan dan performa fitur yang bergantung pada layanan pihak ketiga
        tersebut berada di luar kendali penuh kami, dan kami tidak bertanggung jawab
        atas gangguan yang berasal dari pihak ketiga tersebut.
      </p>

      <h2 id="ki">9. Kekayaan Intelektual</h2>
      <p>
        Seluruh hak atas perangkat lunak, desain antarmuka, logo, dan merek Lecrion
        adalah milik kami atau pemberi lisensi kami. Syarat ini tidak memberikan Anda
        hak kepemilikan apa pun atas Layanan, kecuali hak penggunaan terbatas
        sebagaimana diatur dalam Syarat ini.
      </p>

      <h2 id="tanggung-jawab">10. Batasan Tanggung Jawab</h2>
      <p>
        Layanan disediakan "sebagaimana adanya" (as is) tanpa jaminan apa pun, baik
        tersurat maupun tersirat. Sepanjang diizinkan oleh hukum yang berlaku, kami
        tidak bertanggung jawab atas kerugian tidak langsung, kehilangan keuntungan,
        kehilangan data, atau kerusakan konsekuensial lainnya yang timbul dari
        penggunaan atau ketidakmampuan menggunakan Layanan, termasuk akibat gangguan
        sistem, kesalahan input data oleh pengguna, atau gangguan layanan pihak
        ketiga.
      </p>

      <h2 id="penangguhan">11. Penangguhan & Penghentian</h2>
      <p>
        Kami dapat menangguhkan atau menghentikan akses Anda ke Layanan apabila Anda
        melanggar Syarat ini, menunggak pembayaran, atau apabila diwajibkan oleh
        hukum. Anda dapat menghentikan penggunaan Layanan dan menutup akun Anda kapan
        saja melalui pengaturan akun atau dengan menghubungi kami.
      </p>

      <h2 id="perubahan-layanan">12. Perubahan Layanan dan Syarat</h2>
      <p>
        Kami dapat mengubah, menambah, atau menghentikan fitur Layanan dari waktu ke
        waktu. Kami juga dapat memperbarui Syarat ini; perubahan material akan
        diberitahukan melalui aplikasi atau email terdaftar Anda. Penggunaan Layanan
        yang berkelanjutan setelah perubahan berlaku dianggap sebagai persetujuan Anda
        atas Syarat yang telah diperbarui.
      </p>

      <h2 id="hukum">13. Hukum yang Berlaku dan Penyelesaian Sengketa</h2>
      <p>
        Syarat ini diatur dan ditafsirkan berdasarkan hukum Negara Republik Indonesia.
        Setiap perselisihan yang timbul akan diupayakan penyelesaiannya terlebih
        dahulu secara musyawarah; apabila tidak tercapai kesepakatan, sengketa akan
        diselesaikan melalui pengadilan yang berwenang di Indonesia.
      </p>

      <h2 id="lain">14. Ketentuan Lain-lain</h2>
      <p>
        Apabila salah satu ketentuan dalam Syarat ini dinyatakan tidak sah atau tidak
        dapat dilaksanakan, ketentuan lainnya tetap berlaku penuh. Kegagalan kami
        untuk menegakkan suatu hak dalam Syarat ini tidak dianggap sebagai
        pengesampingan hak tersebut.
      </p>

      <h2 id="kontak">15. Hubungi Kami</h2>
      <p>
        Untuk pertanyaan mengenai Syarat &amp; Ketentuan ini, silakan hubungi kami di{" "}
        <a href="mailto:legal@lecrion.com">legal@lecrion.com</a>.
      </p>
    </LegalPageLayout>
  );
}
