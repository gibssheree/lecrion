import Section from "../layout/Section";

// No icons. Clean cards. Restrained type.
export default function FeatureGridSection() {
  return (
    <Section id="features" tone="paper">
      <div className="lp-section-heading">
        <span>Fitur inti</span>
        <h2>
          Satu sistem.
          <br />
          <em>Bukan tujuh aplikasi yang dipaksa nyambung.</em>
        </h2>
      </div>

      <div className="lp-bento">
        <article className="lp-bento-card lp-bento-card--hero">
          <h3>POS kasir cepat.</h3>
          <p>
            Keranjang multi-meja, register shift, split payment, receipt
            tercetak, dan riwayat transaksi — semua dalam satu layar yang
            dirancang untuk kecepatan kasir.
          </p>
          <div className="lp-bento-card__tags">
            <span>Register shift</span>
            <span>Split payment</span>
            <span>Void & refund</span>
            <span>Barcode</span>
          </div>
        </article>

        <article className="lp-bento-card lp-bento-card--wide">
          <h3>WhatsApp bot.</h3>
          <p>
            Order dari chat pelanggan masuk ke alur kasir dan dapur yang sama.
            Tidak ada input manual ulang.
          </p>
        </article>

        <article className="lp-bento-card">
          <h3>Inventory.</h3>
          <p>
            Stok, supplier, PO, dan mutasi terbaca dari setiap transaksi kasir.
          </p>
        </article>

        <article className="lp-bento-card">
          <h3>Cashflow.</h3>
          <p>
            Kas masuk, invoice, dan aktivitas shift terbaca tanpa rekap akhir
            hari.
          </p>
        </article>

        <article className="lp-bento-card">
          <h3>KDS dapur.</h3>
          <p>
            Order F&amp;B dipantau dapur secara realtime. Tidak perlu
            bolak-balik.
          </p>
        </article>

        <article className="lp-bento-card">
          <h3>Realtime sync.</h3>
          <p>
            Order, stok, dan shift bergerak tanpa refresh manual di semua
            perangkat.
          </p>
        </article>

        <article className="lp-bento-card">
          <h3>Role-aware.</h3>
          <p>
            Owner, kasir, inventory, dan support hanya melihat apa yang relevan.
          </p>
        </article>

        <article className="lp-bento-card">
          <h3>Audit log.</h3>
          <p>
            Setiap aksi penting tercatat — void, refund, adjustment, dan
            perubahan harga.
          </p>
        </article>
      </div>
    </Section>
  );
}
