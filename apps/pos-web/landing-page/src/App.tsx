import SiteFooter from "./components/layout/SiteFooter";
import SiteHeader from "./components/layout/SiteHeader";
import CtaSection from "./components/sections/CtaSection";
import FaqSection from "./components/sections/FaqSection";
import FeatureGridSection from "./components/sections/FeatureGridSection";
import HeroSection from "./components/sections/HeroSection";
import PricingSection from "./components/sections/PricingSection";
import ProblemSection from "./components/sections/ProblemSection";
import ProductPreviewSection from "./components/sections/ProductPreviewSection";
import VerticalUseCasesSection from "./components/sections/VerticalUseCasesSection";
import WhatsAppBotSection from "./components/sections/WhatsAppBotSection";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/landing.css";
import "./styles/motion.css";

// Section order:
// 1. Hero (outcome headline + live ticker + stat strip)
// 2. ProductPreview (screenshot + live feed panel)
// 3. Problem (before/after)
// 4. FeatureGrid (bento layout)
// 5. VerticalUseCases (use cases)
// 6. WhatsAppBot (flow diagram + chat)
// 7. Pricing (with billing toggle, moved after features)
// 8. FAQ
// 9. CTA

export default function App() {
  return (
    <main className="landing-page">
      <SiteHeader />
      <HeroSection />
      <ProductPreviewSection />
      <ProblemSection />
      <FeatureGridSection />
      <VerticalUseCasesSection />
      <WhatsAppBotSection />
      <PricingSection />
      <FaqSection />
      <CtaSection />
      <SiteFooter />
    </main>
  );
}
