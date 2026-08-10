import SiteFooter from "./components/layout/SiteFooter";
import SiteHeader from "./components/layout/SiteHeader";
import CompanySection from "./components/sections/CompanySection";
import CtaSection from "./components/sections/CtaSection";
import FaqSection from "./components/sections/FaqSection";
import HeroSection from "./components/sections/HeroSection";
import ModulesSection from "./components/sections/ModulesSection";
import PlatformSection from "./components/sections/PlatformSection";
import PricingSection from "./components/sections/PricingSection";
import ProductSurfacesSection from "./components/sections/ProductSurfacesSection";
import VerticalUseCasesSection from "./components/sections/VerticalUseCasesSection";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/landing.css";
import "./styles/motion.css";

/**
 * Company site for Lecrion — one narrative, no repeated claims:
 *   Hero            what the company makes
 *   ProductSurfaces the two products, drawn as real UI
 *   Platform        why one data core matters
 *   Modules         what actually ships
 *   Verticals       who it fits
 *   Pricing         what it costs
 *   Company         who is behind it
 *   FAQ / CTA       objections, then the ask
 */
export default function App() {
  return (
    <main className="landing-page">
      <SiteHeader />
      <HeroSection />
      <ProductSurfacesSection />
      <PlatformSection />
      <ModulesSection />
      <VerticalUseCasesSection />
      <PricingSection />
      <CompanySection />
      <FaqSection />
      <CtaSection />
      <SiteFooter />
    </main>
  );
}
