import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCounter } from "../../hooks/useCounter";
import { useReveal } from "../../hooks/useReveal";
import Button from "../ui/Button";

function LiveTicker({
  label,
  base,
  rate,
}: {
  label: string;
  base: number;
  rate: number;
}) {
  const [val, setVal] = useState(base);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setVal((v) => v + Math.floor(Math.random() * rate * 2));
    }, 1600);
    return () => clearInterval(intervalRef.current);
  }, [rate]);

  return (
    <span className="lp-ticker-item">
      <span className="lp-ticker-value">{val.toLocaleString("id-ID")}</span>
      <span className="lp-ticker-label">{label}</span>
    </span>
  );
}

function HeroStat({
  value,
  suffix = "",
  label,
}: {
  value: number;
  suffix?: string;
  label: string;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const count = useCounter(value, 1400, visible);
  return (
    <div ref={ref} className="lp-hero-stat">
      <strong>
        {count.toLocaleString("id-ID")}
        {suffix}
      </strong>
      <span>{label}</span>
    </div>
  );
}

export default function HeroSection() {
  return (
    <section className="lp-hero" aria-labelledby="landing-title">
      <div className="lp-hero__pattern" aria-hidden="true" />

      <div className="lp-container lp-hero__content">
        <div className="lp-ticker" aria-label="Aktivitas sistem saat ini">
          <span className="lp-ticker-live">
            <span className="lp-ticker-dot" aria-hidden="true" />
            Live
          </span>
          <LiveTicker label="transaksi hari ini" base={1847} rate={3} />
          <LiveTicker label="stok diperbarui" base={412} rate={1} />
          <LiveTicker label="shift aktif" base={23} rate={0} />
        </div>

        <h1 id="landing-title">
          Satu sistem untuk
          <br />
          kasir, stok, dan
          <br />
          WhatsApp bot.
        </h1>

        <p className="lp-hero__sub">
          Lecrion menyatukan transaksi outlet dari kasir sampai laporan owner —
          tanpa rekap manual.
        </p>

        <div className="lp-hero__actions">
          <Button href="#contact">
            Jadwalkan demo <ArrowRight size={15} />
          </Button>
          <Button href="#product" variant="secondary">
            Lihat sistemnya
          </Button>
        </div>

        <div className="lp-hero__stats" aria-label="Ringkasan platform">
          <HeroStat value={60} suffix="+" label="modul operasional" />
          <HeroStat value={5} label="role akses" />
          <HeroStat value={7} label="vertikal bisnis" />
        </div>
      </div>
    </section>
  );
}
