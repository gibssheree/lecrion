import { useState } from "react";
import Section from "../layout/Section";

/**
 * The two product surfaces, drawn as real DOM rather than screenshots.
 *
 * The previous version framed `dashboard-preview.png` in browser chrome — but
 * that file was a byte-for-byte copy of the logo, so the "product shot" was a
 * blown-up wordmark. Building the UI in markup keeps it sharp, honest, and in
 * step with the actual app when it changes.
 */

const TABS = [
  {
    id: "pos",
    label: "Lecrion POS",
    caption: "Layar kasir",
    blurb:
      "Keranjang multi-meja, register shift, split payment, dan void bertingkat izin. Tetap jalan saat koneksi putus, tersinkron saat kembali online.",
  },
  {
    id: "chatbot",
    label: "Lecrion Chatbot",
    caption: "Dashboard percakapan",
    blurb:
      "Setiap percakapan WhatsApp terbaca beserta intent, item yang dikenali, dan order yang dibuat. Anda mengawasi bot, bukan menebak isinya.",
  },
] as const;

const PRODUCTS = [
  { name: "Kopi Susu Gula Aren", price: "24.000", stock: "sisa 42" },
  { name: "Americano", price: "20.000", stock: "sisa 58" },
  { name: "Croissant Butter", price: "28.000", stock: "sisa 9", low: true },
  { name: "Matcha Latte", price: "30.000", stock: "sisa 24" },
  { name: "Nasi Ayam Rica", price: "35.000", stock: "sisa 17" },
  { name: "Air Mineral 600ml", price: "8.000", stock: "sisa 96" },
  { name: "Cappuccino", price: "26.000", stock: "sisa 37" },
  { name: "Teh Tarik", price: "18.000", stock: "sisa 61" },
  { name: "Pain au Chocolat", price: "30.000", stock: "sisa 6", low: true },
  { name: "Mie Goreng Spesial", price: "32.000", stock: "sisa 21" },
  { name: "Es Cokelat", price: "25.000", stock: "sisa 44" },
  { name: "Roti Bakar Keju", price: "22.000", stock: "sisa 33" },
];

const CART = [
  { qty: 2, name: "Kopi Susu Gula Aren", price: "48.000" },
  { qty: 1, name: "Croissant Butter", price: "28.000" },
  { qty: 1, name: "Americano", price: "20.000" },
];

const CONVERSATIONS = [
  { name: "+62 812 ···· 3847", snippet: "Mau pesan 2 kopi susu…", time: "16:42", active: true, unread: 0 },
  { name: "+62 857 ···· 1120", snippet: "Jam tutup hari ini?", time: "16:31", active: false, unread: 2 },
  { name: "+62 896 ···· 7754", snippet: "Sudah siap belum ya?", time: "16:18", active: false, unread: 0 },
];

function PosSurface() {
  return (
    <div className="lp-ui" role="img" aria-label="Layar kasir Lecrion POS dengan katalog produk dan keranjang belanja">
      <div className="lp-ui__bar">
        <span className="lp-ui__title">Kopi Ruang · Cabang Tebet</span>
        <span className="lp-ui__chip">
          <i className="lp-dot" /> Shift aktif · Rina
        </span>
        <span className="lp-ui__meta lp-num">16:42</span>
      </div>

      <div className="lp-pos">
        <div className="lp-pos__main">
          <div className="lp-pos__chips">
            {["Semua", "Kopi", "Non-kopi", "Pastry", "Makanan"].map((c, i) => (
              <span key={c} className={i === 0 ? "is-active" : ""}>
                {c}
              </span>
            ))}
          </div>

          <div className="lp-pos__grid">
            {PRODUCTS.map((p) => (
              <div className="lp-pos__tile" key={p.name}>
                <span className="lp-pos__tile-name">{p.name}</span>
                <span className="lp-pos__tile-price lp-num">Rp {p.price}</span>
                <span className={`lp-pos__tile-stock${p.low ? " is-low" : ""}`}>
                  {p.stock}
                </span>
              </div>
            ))}
          </div>
        </div>

        <aside className="lp-pos__cart">
          <div className="lp-pos__cart-head">
            <strong>Meja 04</strong>
            <span>Dine in</span>
          </div>

          <div className="lp-pos__lines">
            {CART.map((line) => (
              <div className="lp-pos__line" key={line.name}>
                <span className="lp-pos__qty lp-num">{line.qty}</span>
                <span className="lp-pos__line-name">{line.name}</span>
                <span className="lp-num">{line.price}</span>
              </div>
            ))}
          </div>

          <div className="lp-pos__totals">
            <div>
              <span>Subtotal</span>
              <span className="lp-num">96.000</span>
            </div>
            <div>
              <span>PPN 11%</span>
              <span className="lp-num">10.560</span>
            </div>
            <div className="is-total">
              <span>Total</span>
              <span className="lp-num">Rp 106.560</span>
            </div>
          </div>

          <div className="lp-pos__pay">Bayar · QRIS</div>
        </aside>
      </div>
    </div>
  );
}

function ChatbotSurface() {
  return (
    <div className="lp-ui" role="img" aria-label="Dashboard chatbot Lecrion menampilkan percakapan WhatsApp, intent terdeteksi, dan order yang dibuat">
      <div className="lp-ui__bar">
        <span className="lp-ui__title">Chatbot · WhatsApp Business</span>
        <span className="lp-ui__chip">
          <i className="lp-dot" /> Terhubung
        </span>
        <span className="lp-ui__meta lp-mono">+62 811 ···· 9020</span>
      </div>

      <div className="lp-bot">
        <div className="lp-bot__list">
          {CONVERSATIONS.map((c) => (
            <div key={c.name} className={`lp-bot__conv${c.active ? " is-active" : ""}`}>
              <div className="lp-bot__conv-top">
                <span className="lp-mono">{c.name}</span>
                <span className="lp-bot__conv-time lp-num">{c.time}</span>
              </div>
              <span className="lp-bot__conv-snip">{c.snippet}</span>
              {c.unread > 0 && <span className="lp-bot__unread lp-num">{c.unread}</span>}
            </div>
          ))}
        </div>

        <div className="lp-bot__thread">
          <p className="is-user">Mau pesan 2 kopi susu gula aren sama 1 croissant ya</p>
          <p className="is-bot">
            Baik. Order <strong>#2848</strong> sudah masuk ke kasir dan dapur.
            <small>Total Rp 76.000 · estimasi 8 menit</small>
          </p>
          <p className="is-user">Bayar QRIS bisa?</p>
          <p className="is-bot">
            Bisa. QRIS sudah disiapkan di kasir atas nama order #2848.
          </p>

          <div className="lp-bot__composer">
            <span>Balas sebagai staf, bot dijeda saat Anda mengetik</span>
            <span>Ambil alih</span>
          </div>
        </div>

        <aside className="lp-bot__side">
          <span className="lp-bot__side-label">Hasil analisis</span>

          <div className="lp-bot__card">
            <div className="lp-bot__row">
              <span>Intent</span>
              <strong>create_order</strong>
            </div>
            <div className="lp-bot__row">
              <span>Keyakinan</span>
              <strong className="lp-num">0,96</strong>
            </div>
            <div className="lp-bot__row">
              <span>Item dikenali</span>
              <strong className="lp-num">2</strong>
            </div>
          </div>

          <span className="lp-bot__side-label">Tindakan sistem</span>

          <div className="lp-bot__card">
            <div className="lp-bot__action">
              <i className="lp-dot" />
              Order #2848 dibuat
            </div>
            <div className="lp-bot__action">
              <i className="lp-dot" />
              Tiket dapur T-0092
            </div>
            <div className="lp-bot__action">
              <i className="lp-dot" />
              Cashflow diperbarui
            </div>
          </div>

          <div className="lp-bot__model lp-mono">
            model: gpt-4o-mini · 840 ms · 512 tok
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function ProductSurfacesSection() {
  const [tab, setTab] = useState<"pos" | "chatbot">("pos");
  const active = TABS.find((t) => t.id === tab)!;

  return (
    <Section id="produk" tone="dark" wide>
      <div className="lp-section-heading">
        <h2>
          Dua permukaan kerja.
          <br />
          <em>Satu basis data di belakangnya.</em>
        </h2>
        <p>
          Staf memakai kasir. Pelanggan memakai WhatsApp. Keduanya menulis ke
          catatan yang sama, jadi tidak ada rekap yang perlu dicocokkan.
        </p>
      </div>

      <div className="lp-tabs" role="tablist" aria-label="Pilih produk">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`lp-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`lp-panel-${t.id}`}
            className={`lp-tab${tab === t.id ? " is-active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <strong>{t.label}</strong>
            <span>{t.caption}</span>
          </button>
        ))}
      </div>

      <div
        className="lp-surface"
        role="tabpanel"
        id={`lp-panel-${tab}`}
        aria-labelledby={`lp-tab-${tab}`}
      >
        {tab === "pos" ? <PosSurface /> : <ChatbotSurface />}
      </div>

      <p className="lp-surface__note">{active.blurb}</p>
    </Section>
  );
}
