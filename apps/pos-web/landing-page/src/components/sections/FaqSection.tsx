import { faqs } from "../../data/faqs";
import Section from "../layout/Section";
import FaqItem from "../ui/FaqItem";

export default function FaqSection() {
  return (
    <Section>
      <div className="lp-section-heading">
        <span>FAQ</span>
        <h2>Pertanyaan umum sebelum demo.</h2>
      </div>
      <div className="lp-faq-list">
        {faqs.map((faq) => <FaqItem key={faq.question} {...faq} />)}
      </div>
    </Section>
  );
}
