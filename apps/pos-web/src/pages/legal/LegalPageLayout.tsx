import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Info } from "lucide-react";
import "./legal.css";

const lecrionLogo = "/Lecrion.png";

interface Props {
  title: string;
  updatedAt: string;
  toc?: Array<{ id: string; label: string }>;
  children: ReactNode;
}

export default function LegalPageLayout({ title, updatedAt, toc, children }: Props) {
  return (
    <div className="legal-page">
      <header className="legal-header">
        <div className="legal-header-brand">
          <img src={lecrionLogo} alt="Lecrion" />
        </div>
        <Link to="/" className="legal-header-back">
          <ArrowLeft size={14} /> Kembali ke Beranda
        </Link>
      </header>

      <div className="legal-body">
        <div className="legal-content">
          <h1 className="legal-title">{title}</h1>
          <div className="legal-updated">Terakhir diperbarui: {updatedAt}</div>

          <div className="legal-notice">
            <Info size={16} />
            <span>
              Dokumen ini adalah draf template dan belum ditinjau oleh penasihat hukum.
              Sebelum digunakan secara resmi, mohon lengkapi data badan usaha yang sah dan
              minta tinjauan dari konsultan hukum sesuai yurisdiksi Anda.
            </span>
          </div>

          {toc && toc.length > 0 && (
            <nav className="legal-toc" aria-label="Daftar isi">
              {toc.map((item) => (
                <a key={item.id} href={`#${item.id}`}>
                  {item.label}
                </a>
              ))}
            </nav>
          )}

          <div className="legal-prose">{children}</div>
        </div>
      </div>

      <footer className="legal-footer">
        © {new Date().getFullYear()} Lecrion. Seluruh hak cipta dilindungi.
      </footer>
    </div>
  );
}
