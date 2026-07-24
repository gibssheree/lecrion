# LECRION POS — ROADMAP PRIORITAS PENGEMBANGAN
**Untuk Tim IT — Juli 2026**

Lecrion berjalan sebagai satu sistem POS yang menyatukan sistem kasir, pencatatan keuangan, dan stock opname, dengan seluruh modul terintegrasi ke AI Owner Assistant sebagai lapisan kendali dan insight untuk pemilik bisnis. Dokumen ini merangkum prioritas pengembangan berikutnya berdasarkan hasil analisis daya saing terhadap kompetitor (Majoo, Olsera, Moka POS, dan pemain lain di pasar Indonesia).

---

## Ringkasan Posisi Kompetitif

* **Kekuatan yang sudah unggul:** anti-fraud layer (koreksi transaksi immutable + approval manajer) dan AI Owner Assistant berbasis bahasa natural — dua hal yang belum dimiliki kompetitor secara setara.
* **Gap yang perlu ditutup:** beberapa fitur di bawah ini sudah menjadi standar pasar pada kompetitor, sehingga prioritasnya tinggi agar Lecrion tidak kalah di fitur dasar saat dibandingkan langsung oleh calon pengguna.

---

## Tabel Prioritas Pengembangan

| No | Fitur | Prioritas | Deskripsi & Alasan |
|---|---|---|---|
| 1 | **Split Payment** | **TINGGI** | Bayar 1 transaksi dengan lebih dari 1 metode (contoh: sebagian tunai, sebagian QRIS). Sudah jadi fitur standar di hampir semua kompetitor. Effort pengembangan relatif kecil, dampak besar terhadap kelayakan produk terutama untuk resto/cafe. |
| 2 | **Grafik Penjualan per Jam & Export CSV** | **TINGGI** | Visualisasi pola penjualan per jam dan kemampuan ekspor laporan ke CSV/Excel. Fitur reporting dasar yang sudah lama tersedia di kompetitor. Quick win — effort kecil, langsung menaikkan kredibilitas produk saat demo ke calon merchant. |
| 3 | **Integrasi Order Aggregator (GoFood / GrabFood / ShopeeFood)** | **TINGGI** | Semua pesanan dari platform pihak ketiga masuk ke satu dashboard Lecrion, tidak perlu buka aplikasi terpisah. Ini sudah jadi standar industri untuk bisnis F&B di Indonesia. Effort besar (butuh integrasi API pihak ketiga), tapi dampaknya besar terhadap keputusan resto memilih platform. |
| 4 | **Mode Offline / Hybrid** | **SEDANG** | Transaksi tetap bisa dilakukan saat koneksi internet terputus, lalu data tersinkronisasi otomatis ke cloud saat online kembali. Penting terutama untuk toko bangunan atau lokasi dengan sinyal internet tidak stabil. |
| 5 | **Multi-Keranjang Paralel** | **SEDANG** | Kasir dapat membuka lebih dari 1 keranjang transaksi sekaligus untuk melayani beberapa pelanggan/meja secara bersamaan. Penting untuk resto/cafe pada jam sibuk, namun bisnis skala kecil-menengah masih bisa berjalan tanpa fitur ini untuk sementara. |
| 6 | **CRM Pelanggan Dasar** | **RENDAH** | Pencatatan data pelanggan dan riwayat transaksi untuk mendukung program loyalitas lanjutan. Dapat masuk paket Scale, tidak perlu dikejar di rilis awal. |

---

## Catatan Integrasi dengan AI Owner Assistant

Setiap fitur baru di atas sebaiknya dirancang agar datanya juga dapat diakses/ditanyakan melalui AI Owner Assistant, bukan hanya tampil di dashboard biasa. Contoh:
* **Split payment** $\rightarrow$ owner bisa tanya *"berapa transaksi yang dibayar campur tunai-QRIS minggu ini?"*
* **Order aggregator** $\rightarrow$ owner bisa tanya *"order dari GoFood vs walk-in mana yang lebih banyak hari ini?"*
* **Mode offline** $\rightarrow$ sistem bisa memberi notifikasi proaktif ke owner saat outlet sempat offline dan berapa lama.

Pendekatan ini menjaga AI Owner Assistant tetap menjadi diferensiator utama Lecrion, bukan sekadar fitur tambahan yang terpisah dari modul lain.

---

## Urutan Pengerjaan yang Disarankan

* **Fase 1 (Quick Win):** Split Payment, Grafik per Jam & Export CSV.
* **Fase 2 (Effort Besar, Dampak Besar):** Integrasi Order Aggregator.
* **Fase 3 (Penguatan Operasional):** Mode Offline/Hybrid, Multi-Keranjang Paralel.
* **Fase 4 (Pelengkap):** CRM Pelanggan Dasar.

*Dokumen ini untuk kebutuhan internal tim IT Lecrion.*
