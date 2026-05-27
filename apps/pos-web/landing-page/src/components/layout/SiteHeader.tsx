import { Menu, X } from "lucide-react";
import { useMobileMenu } from "../../hooks/useMobileMenu";
import Button from "../ui/Button";
import Logo from "../ui/Logo";

const NAV_LINKS = [
  { href: "#product", label: "Produk" },
  { href: "#features", label: "Fitur" },
  { href: "#pricing", label: "Harga" },
  { href: "#contact", label: "Demo" },
];

export default function SiteHeader() {
  const { open, toggle, setOpen } = useMobileMenu();

  return (
    <>
      <header className="lp-site-header">
        <a className="lp-site-brand" href="/" aria-label="Lecrion">
          <Logo />
        </a>

        <nav className="lp-site-nav" aria-label="Navigasi utama">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="lp-header-actions">
          <a className="lp-login-link" href="/login">
            Masuk
          </a>
          <Button href="/login" className="lp-header-cta">
            Buka POS
          </Button>
        </div>

        <button
          className="lp-mobile-menu"
          type="button"
          aria-label={open ? "Tutup menu" : "Buka menu"}
          aria-expanded={open}
          onClick={toggle}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      {open && (
        <div
          className="lp-mobile-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi"
        >
          <nav className="lp-mobile-nav">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="lp-mobile-nav__actions">
              <a
                href="/login"
                className="lp-mobile-login"
                onClick={() => setOpen(false)}
              >
                Masuk
              </a>
              <Button href="/login" onClick={() => setOpen(false)}>
                Buka POS
              </Button>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
