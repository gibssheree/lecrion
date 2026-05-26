export default function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="lp-faq-item">
      <summary>{question}</summary>
      <p>{answer}</p>
    </details>
  );
}
