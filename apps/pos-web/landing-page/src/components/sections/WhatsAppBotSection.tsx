import { Bot, Send } from "lucide-react";
import Section from "../layout/Section";

export default function WhatsAppBotSection() {
  return (
    <Section>
      <div className="lp-bot-layout">
        <div className="lp-section-heading">
          <span>WhatsApp bot</span>
          <h2>Order dari chat tidak berhenti sebagai chat.</h2>
          <p>Bot bisa menjadi pintu masuk pelanggan, lalu order diteruskan ke alur kasir, dapur, dan laporan.</p>
        </div>
        <div className="lp-chat-window">
          <strong><Bot size={18} /> Lecrion Bot</strong>
          <p className="is-user">Mau pesan 2 kopi susu dan 1 croissant.</p>
          <p className="is-bot">Siap. Order #1042 sudah masuk ke kasir dan dapur.</p>
          <div><span>Ketik pesan...</span><Send size={17} /></div>
        </div>
      </div>
    </Section>
  );
}
