import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { CheckCircle, RotateCcw, Save, Settings } from "lucide-react";
import PosAppShell from "../../components/layout/PosAppShell";
import { useApi } from "../../hooks/useApi";
import { getSettings, saveSettings } from "../../services/api";
import Select from "../../components/ui/Select";
import Checkbox from "../../components/ui/Checkbox";

interface FieldDef {
  key: string;
  label: string;
  type: "text" | "number" | "checkbox" | "select";
  options?: string[];
}

interface SectionDef {
  section: string;
  fields: FieldDef[];
}

const FIELDS: SectionDef[] = [
  {
    section: "Informasi Toko",
    fields: [
      { key: "storeName", label: "Nama Toko", type: "text" },
      { key: "storeAddress", label: "Alamat", type: "text" },
      { key: "storePhone", label: "No. Telepon", type: "text" },
      {
        key: "businessType",
        label: "Kategori Bisnis",
        type: "select",
        options: ["general", "retail", "restaurant", "cafe", "service"],
      },
    ],
  },
  {
    section: "Pesanan Default",
    fields: [
      {
        key: "defaultOrderType",
        label: "Tipe Pesanan Default",
        type: "select",
        options: ["pickup", "delivery"],
      },
      {
        key: "defaultPaymentMethod",
        label: "Metode Bayar Default",
        type: "text",
      },
    ],
  },
  {
    section: "Notifikasi Stok",
    fields: [
      {
        key: "lowStockAlertsEnabled",
        label: "Aktifkan Alert Stok Menipis",
        type: "checkbox",
      },
      {
        key: "lowStockThreshold",
        label: "Ambang Stok",
        type: "number",
      },
      {
        key: "lowStockAlertTargets",
        label: "Nomor WA Tujuan Alert",
        type: "text",
      },
    ],
  },
  {
    section: "Admin",
    fields: [
      {
        key: "adminPhones",
        label:
          "Nomor WA Admin (boleh akses laporan & stok via WhatsApp) — pisahkan dengan koma",
        type: "text",
      },
    ],
  },
];

export default function ChatbotSettingsPage() {
  const settings = useApi(getSettings, []);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (settings.data) {
      setForm({
        ...(settings.data as Record<string, string>),
        businessType:
          (settings.data as Record<string, string>).businessType ?? "general",
      });
    }
  }, [settings.data]);

  function onChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const target = event.target as HTMLInputElement;
    setForm((prev) => ({
      ...prev,
      [target.name]:
        target.type === "checkbox" ? String(target.checked) : target.value,
    }));
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      await saveSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error: unknown) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PosAppShell title="Chatbot Settings">
      {settings.loading && (
        <div className="loading-center chatbot-loading">
          <div className="spinner" />
          <span>Memuat konfigurasi...</span>
        </div>
      )}

      {settings.error && (
        <div className="alert alert-error">{settings.error}</div>
      )}

      {!settings.loading && !settings.error && (
        <form onSubmit={handleSave}>
          {saved && (
            <div className="alert alert-success">
              <CheckCircle size={14} /> Konfigurasi berhasil disimpan
            </div>
          )}

          {saveError && (
            <div className="alert alert-error">
              Gagal menyimpan: {saveError}
            </div>
          )}

          <div className="chatbot-settings-sections">
          {FIELDS.map(({ section, fields }) => (
            <div className="dashboard-card" key={section}>
              <div className="dashboard-card-header">
                <span className="chatbot-label-inline">
                  <Settings size={14} /> {section}
                </span>
              </div>
              <div className="dashboard-card-body">
                <div className="chatbot-settings-grid">
                  {fields.map(({ key, label, type, options }) => (
                    <div
                      className={
                        type === "checkbox"
                          ? "form-group chatbot-checkbox-field"
                          : "form-group"
                      }
                      key={key}
                    >
                      {type === "checkbox" ? (
                        <Checkbox
                          id={key}
                          name={key}
                          checked={form[key] === "true"}
                          onChange={onChange}
                          label={label}
                        />
                      ) : type === "select" ? (
                        <>
                          <label className="form-label" htmlFor={key}>
                            {label}
                          </label>
                          <Select
                            id={key}
                            name={key}
                            value={form[key] ?? ""}
                            onChange={(e) => onChange(e as unknown as ChangeEvent<HTMLSelectElement>)}
                          >
                            {options?.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </Select>
                        </>
                      ) : (
                        <>
                          <label className="form-label" htmlFor={key}>
                            {label}
                          </label>
                          <input
                            id={key}
                            name={key}
                            type={type}
                            className="form-input"
                            value={form[key] ?? ""}
                            onChange={onChange}
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
          </div>

          <div className="chatbot-form-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                setForm((settings.data as Record<string, string>) ?? {})
              }
            >
              <RotateCcw size={13} /> Reset
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <div className="spinner chatbot-button-spinner" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save size={13} /> Simpan Konfigurasi
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </PosAppShell>
  );
}
