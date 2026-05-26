import { ArrowRight, Menu } from "lucide-react";
import Button from "../ui/Button";
import Logo from "../ui/Logo";

export default function SiteHeader() {
  return (
    <header className="lp-site-header">
      <a className="lp-site-brand" href="/" aria-label="Lecrion landing">
        <Logo />
      </a>
      <nav className="lp-site-nav" aria-label="Landing navigation">
        <a href="#product">Produk</a>
        <a href="#workflow">Workflow</a>
        <a href="#features">Fitur</a>
        <a href="#pricing">Harga</a>
      </nav>
      <div className="lp-header-actions">
        <a className="lp-login-link" href="/login">Masuk</a>
        <Button href="/login" className="lp-header-cta">
          Buka POS <ArrowRight size={16} />
        </Button>
      </div>
      <button className="lp-mobile-menu" type="button" aria-label="Buka menu">
        <Menu size={20} />
      </button>
    </header>
  );
}
