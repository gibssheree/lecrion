import Section from "../layout/Section";

const FLOW = [
  { label: "Chat pelanggan masuk", detail: "Via WhatsApp +62812-xxxx" },
  { label: "Bot parse intent & item", detail: "Order, 2 item teridentifikasi" },
  { label: "Order dibuat di kasir", detail: "Order #2848, Rp 68.000" },
  { label: "Tiket KDS aktif", detail: "Dapur menerima T-0092" },
  { label: "Cashflow otomatis tercatat", detail: "Income hari ini diperbarui" },
  { label: "Owner lihat realtime", detail: "Tanpa rekap manual" },
];

export default function WhatsAppBotSection() {
  return (
    <Section id="workflow" tone="paper">
      <div className="lp-section-heading">
        <span>WhatsApp bot</span>
        <h2>
          Order dari chat
          <br />
          <em>tidak berhenti sebagai chat.</em>
        </h2>
        <p>
          Bot menjadi pintu masuk pelanggan. Dari satu pesan, order mengalir ke
          kasir, dapur, cashflow, dan laporan tanpa input manual.
        </p>
      </div>

      <div className="lp-bot-section">
        <ol className="lp-flow" aria-label="Alur order WhatsApp">
          {FLOW.map((step) => (
            <li key={step.label} className="lp-flow__step">
              <span className="lp-flow__label">{step.label}</span>
              <span className="lp-flow__detail">{step.detail}</span>
            </li>
          ))}
        </ol>

        <aside className="lp-bot-chat" aria-label="Contoh percakapan">
          <div className="lp-bot-chat__header">
            <strong>Lecrion Bot</strong>
            <span className="lp-bot-chat__online">Online</span>
          </div>
          <div className="lp-bot-chat__messages">
            <p className="is-user">Mau pesan 2 kopi susu dan 1 croissant.</p>
            <p className="is-bot">
              Siap. Order #2848 sudah masuk ke kasir dan dapur.
              <small>Total Rp 68.000 · Estimasi 8 menit</small>
            </p>
            <p className="is-user">Bayar QRIS ya.</p>
            <p className="is-bot">
              Oke, QRIS sudah disiapkan. Scan di kasir atau minta ke staff.
            </p>
          </div>
        </aside>
      </div>
    </Section>
  );
}
