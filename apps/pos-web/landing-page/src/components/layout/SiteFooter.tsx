import Logo from "../ui/Logo";

const COLUMNS = [
  {
    title: "Produk",
    links: [
      { label: "Lecrion POS", href: "#produk" },
      { label: "Lecrion Chatbot", href: "#produk" },
      { label: "Platform", href: "#platform" },
      { label: "Harga", href: "#harga" },
    ],
  },
  {
    title: "Solusi",
    links: [
      { label: "Cafe & resto", href: "#solusi" },
      { label: "Retail", href: "#solusi" },
      { label: "Multi-cabang", href: "#solusi" },
      { label: "Laundry & jasa", href: "#solusi" },
    ],
  },
  {
    title: "Perusahaan",
    links: [
      { label: "Tentang Lecrion", href: "#perusahaan" },
      { label: "Hubungi kami", href: "mailto:halo@lecrion.id" },
      { label: "Masuk", href: "/login" },
      { label: "Daftar", href: "/register" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Kebijakan privasi", href: "/kebijakan-privasi" },
      { label: "Syarat & ketentuan", href: "/syarat-ketentuan" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-container lp-container--wide">
        <div className="lp-footer__top">
          <div className="lp-footer__brand">
            <Logo invert />
            <p>
              Sistem operasi untuk outlet: kasir, chatbot WhatsApp, stok, dan
              laporan di atas satu basis data.
            </p>
            <a className="lp-footer__mail" href="mailto:halo@lecrion.id">
              halo@lecrion.id
            </a>
          </div>

          <nav className="lp-footer__nav" aria-label="Peta situs">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3>{col.title}</h3>
                <ul>
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a href={link.href}>{link.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="lp-footer__bottom">
          <span>© {new Date().getFullYear()} Lecrion. Seluruh hak cipta dilindungi.</span>
          <span>Dibuat untuk operasional outlet di Indonesia.</span>
        </div>
      </div>
    </footer>
  );
}
