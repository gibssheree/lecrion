import { FormEvent, useEffect, useState } from "react";
import {
  Check,
  CheckCircle,
  Clock,
  Monitor,
  Save,
  Settings2,
  ShoppingBag,
  Wallet,
  X,
} from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { getSettings, saveSettings } from "../../services/api";

const PAYMENT_METHODS = [
  { key: "tunai", label: "Tunai" },
  { key: "transfer", label: "Transfer Bank" },
  { key: "qris", label: "QRIS" },
  { key: "ewallet", label: "E-Wallet" },
  { key: "komplimen", label: "Komplimen" },
];

interface Props {
  onClose: () => void;
}

export default function KasirSettingsModal({ onClose }: Props) {
  const settings = useApi(getSettings, []);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings.data) {
      const d = settings.data as Record<string, string>;
      setForm({
        hideProductStock: d.hideProductStock ?? "false",
        kasirDisplayEnabled: d.kasirDisplayEnabled ?? "false",
        requireOpeningCash: d.requireOpeningCash ?? "false",
        autoCloseKasir: d.autoCloseKasir ?? "false",
        autoCloseTime: d.autoCloseTime ?? "00:00",
        requireClosingCash: d.requireClosingCash ?? "false",
        allowSaveOrder: d.allowSaveOrder ?? "true",
        kasirPaymentMethods:
          d.kasirPaymentMethods ?? "tunai,transfer,qris",
      });
    }
  }, [settings.data]);

  function toggle(key: string) {
    setForm((p) => ({ ...p, [key]: p[key] === "true" ? "false" : "true" }));
  }

  function togglePayment(key: string) {
    const methods = (form.kasirPaymentMethods ?? "")
      .split(",")
      .filter(Boolean);
    const idx = methods.indexOf(key);
    if (idx === -1) methods.push(key);
    else methods.splice(idx, 1);
    setForm((p) => ({ ...p, kasirPaymentMethods: methods.join(",") }));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSettings(form);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1000);
    } finally {
      setSaving(false);
    }
  }

  const on = (key: string) => form[key] === "true";
  const hasPm = (key: string) =>
    (form.kasirPaymentMethods ?? "").split(",").includes(key);

  return (
    <div className="ks-overlay" onClick={onClose}>
      <div className="ks-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ks-header">
          <Settings2 size={16} />
          <span>Pengaturan Kasir</span>
          <button
            type="button"
            className="ks-close"
            onClick={onClose}
            aria-label="Tutup"
          >
            <X size={16} />
          </button>
        </div>

        {settings.loading ? (
          <div className="ks-body ks-loading">
            <div className="spinner" />
            <span>Memuat pengaturan…</span>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div className="ks-body">
              {/* Tampilan */}
              <div className="ks-section-label">
                <Monitor size={13} /> Tampilan
              </div>

              <div className="ks-row">
                <div className="ks-row-info">
                  <span className="ks-row-title">Sembunyikan Stok Produk</span>
                  <span className="ks-row-desc">
                    Jumlah stok tidak tampil di kartu produk kasir
                  </span>
                </div>
                <button
                  type="button"
                  className={`ks-toggle${on("hideProductStock") ? " on" : ""}`}
                  onClick={() => toggle("hideProductStock")}
                />
              </div>

              <div className="ks-row">
                <div className="ks-row-info">
                  <span className="ks-row-title">Kasir Display</span>
                  <span className="ks-row-desc">
                    Tampilkan layar pelanggan saat transaksi berlangsung
                  </span>
                </div>
                <button
                  type="button"
                  className={`ks-toggle${on("kasirDisplayEnabled") ? " on" : ""}`}
                  onClick={() => toggle("kasirDisplayEnabled")}
                />
              </div>

              {/* Pembukaan & Penutupan */}
              <div className="ks-section-label">
                <Clock size={13} /> Pembukaan &amp; Penutupan
              </div>

              <div className="ks-row">
                <div className="ks-row-info">
                  <span className="ks-row-title">Wajib Input Kas Awal</span>
                  <span className="ks-row-desc">
                    Kasir harus mengisi nominal kas awal saat membuka sesi
                  </span>
                </div>
                <button
                  type="button"
                  className={`ks-toggle${on("requireOpeningCash") ? " on" : ""}`}
                  onClick={() => toggle("requireOpeningCash")}
                />
              </div>

              <div className="ks-row">
                <div className="ks-row-info">
                  <span className="ks-row-title">
                    Isi Kas Akhir saat Tutup
                  </span>
                  <span className="ks-row-desc">
                    Kasir wajib input nominal kas akhir saat menutup sesi
                  </span>
                </div>
                <button
                  type="button"
                  className={`ks-toggle${on("requireClosingCash") ? " on" : ""}`}
                  onClick={() => toggle("requireClosingCash")}
                />
              </div>

              <div className="ks-row">
                <div className="ks-row-info">
                  <span className="ks-row-title">Tutup Kasir Otomatis</span>
                  <span className="ks-row-desc">
                    Sesi kasir otomatis ditutup pada jam yang ditentukan
                  </span>
                </div>
                <div className="ks-row-controls">
                  {on("autoCloseKasir") && (
                    <input
                      type="time"
                      className="ks-time-input"
                      value={form.autoCloseTime ?? "00:00"}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          autoCloseTime: e.target.value,
                        }))
                      }
                    />
                  )}
                  <button
                    type="button"
                    className={`ks-toggle${on("autoCloseKasir") ? " on" : ""}`}
                    onClick={() => toggle("autoCloseKasir")}
                  />
                </div>
              </div>

              {/* Operasional */}
              <div className="ks-section-label">
                <ShoppingBag size={13} /> Operasional
              </div>

              <div className="ks-row">
                <div className="ks-row-info">
                  <span className="ks-row-title">Simpan Order</span>
                  <span className="ks-row-desc">
                    Kasir dapat menyimpan pesanan sebelum melakukan pembayaran
                  </span>
                </div>
                <button
                  type="button"
                  className={`ks-toggle${on("allowSaveOrder") ? " on" : ""}`}
                  onClick={() => toggle("allowSaveOrder")}
                />
              </div>

              {/* Metode Pembayaran */}
              <div className="ks-section-label">
                <Wallet size={13} /> Metode Pembayaran
              </div>
              <p className="ks-section-note">
                Pilih metode pembayaran yang ditampilkan di kasir
              </p>
              <div className="ks-payment-grid">
                {PAYMENT_METHODS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    className={`ks-payment-chip${hasPm(key) ? " active" : ""}`}
                    onClick={() => togglePayment(key)}
                  >
                    {hasPm(key) && <Check size={11} />}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="ks-footer">
              {saved && (
                <span className="ks-saved-msg">
                  <CheckCircle size={13} /> Tersimpan
                </span>
              )}
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onClose}
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="spinner chatbot-button-spinner" />
                    Menyimpan…
                  </>
                ) : (
                  <>
                    <Save size={13} /> Simpan
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
