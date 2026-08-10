import { ArrowRight } from "lucide-react";
import Button from "../ui/Button";

/**
 * Drop the hero portrait in as `src/assets/hero-portrait.jpg` (portrait crop,
 * roughly 4:5, at least 1000px wide), then:
 *
 *   import heroPortrait from "../../assets/hero-portrait.jpg";
 *   const HERO_PHOTO = heroPortrait;
 *
 * Until then the right column holds its space so the layout does not shift
 * when the photo lands.
 */
const HERO_PHOTO: string | null = null;

const POINTS = [
  {
    label: "Kasir tetap jalan tanpa internet",
    detail: "Transaksi tersimpan di perangkat dan tersinkron saat koneksi kembali.",
  },
  {
    label: "Order WhatsApp masuk sendiri",
    detail: "Pesan pelanggan menjadi order kasir dan tiket dapur tanpa diketik ulang.",
  },
  {
    label: "Angka owner sama dengan angka kasir",
    detail: "Laporan dibaca dari transaksi aslinya, bukan dari rekap yang disusun ulang.",
  },
];

export default function HeroSection() {
  return (
    <section className="lp-hero" aria-labelledby="lp-hero-title">
      <div className="lp-hero__grid" aria-hidden="true" />

      <div className="lp-container lp-container--wide lp-hero__inner">
        <div className="lp-hero__text">
          <h1 id="lp-hero-title">
            Sistem operasi untuk
            <br />
            outlet Anda.
          </h1>

          <p className="lp-hero__sub">
            Lecrion menjalankan dua produk di atas satu basis data: kasir yang
            dipakai staf setiap hari, dan chatbot WhatsApp yang melayani
            pelanggan Anda. Satu angka, satu sumber kebenaran.
          </p>

          <div className="lp-hero__actions">
            <Button href="#produk" className="lp-button--lg">
              Lihat produknya <ArrowRight size={16} />
            </Button>
            <Button href="#kontak" variant="secondary" className="lp-button--lg">
              Jadwalkan demo
            </Button>
          </div>

          <ul className="lp-hero__points">
            {POINTS.map((point) => (
              <li key={point.label}>
                <strong>{point.label}</strong>
                <span>{point.detail}</span>
              </li>
            ))}
          </ul>
        </div>

        <figure className="lp-hero__media">
          {HERO_PHOTO ? (
            <img src={HERO_PHOTO} alt="Staf outlet menggunakan Lecrion di kasir" />
          ) : (
            <div className="lp-hero__media-slot" aria-hidden="true" />
          )}
        </figure>
      </div>
    </section>
  );
}
