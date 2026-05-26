import { ArrowRight, CheckCircle2, MessageCircle, Sparkles } from "lucide-react";
import heroImage from "../../assets/lecrion-hero.png";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Stat from "../ui/Stat";

export default function HeroSection() {
  return (
    <section className="lp-hero" aria-labelledby="landing-title">
      <img className="lp-hero__image" src={heroImage} alt="" />
      <div className="lp-hero__shade" />
      <div className="lp-container lp-hero__content">
        <Badge>
          <Sparkles size={15} />
          POS modern untuk bisnis FnB dan retail yang mulai serius
        </Badge>
        <h1 id="landing-title">Lecrion</h1>
        <p>
          Satu sistem untuk kasir, order WhatsApp, dapur, inventory, cashflow,
          dan laporan outlet. Dibuat untuk operasional yang bergerak cepat,
          bukan sekadar dashboard cantik.
        </p>
        <div className="lp-hero__actions">
          <Button href="#contact">
            Jadwalkan demo <ArrowRight size={18} />
          </Button>
          <Button href="#product" variant="secondary">
            Lihat sistemnya
          </Button>
        </div>
        <div className="lp-hero__proof">
          <span><CheckCircle2 size={16} />Kasir dan register shift</span>
          <span><MessageCircle size={16} />WhatsApp bot operasional</span>
        </div>
        <div className="lp-stats" aria-label="Ringkasan Lecrion">
          <Stat value="1" label="kasir, bot, dan dashboard" />
          <Stat value="24/7" label="sync order dan stok" />
          <Stat value="Multi" label="outlet dan role staff" />
        </div>
      </div>
    </section>
  );
}
