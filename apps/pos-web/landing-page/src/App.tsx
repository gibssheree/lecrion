import SiteFooter from "./components/layout/SiteFooter";
import SiteHeader from "./components/layout/SiteHeader";
import CtaSection from "./components/sections/CtaSection";
import FaqSection from "./components/sections/FaqSection";
import FeatureGridSection from "./components/sections/FeatureGridSection";
import HeroSection from "./components/sections/HeroSection";
import PricingSection from "./components/sections/PricingSection";
import ProblemSection from "./components/sections/ProblemSection";
import ProductPreviewSection from "./components/sections/ProductPreviewSection";
import RealtimeOpsSection from "./components/sections/RealtimeOpsSection";
import VerticalUseCasesSection from "./components/sections/VerticalUseCasesSection";
import WhatsAppBotSection from "./components/sections/WhatsAppBotSection";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/landing.css";

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
      <RealtimeOpsSection />
      <PricingSection />
      <FaqSection />
      <CtaSection />
      <SiteFooter />
    </main>
  );
}
