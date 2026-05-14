import { useState, useEffect } from "react";
import { useApi } from "../hooks/useApi";
import { getSettings, saveSettings } from "../services/api";
import {
  Settings as SettingsIcon,
  Save,
  RotateCcw,
  CheckCircle,
} from "lucide-react";

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
        label: "Ambang Stok (angka)",
        type: "number",
      },
      {
        key: "lowStockAlertTargets",
        label: "Nomor WA Tujuan Alert (pisah koma)",
        type: "text",
      },
    ],
  },
  {
    section: "Admin",
    fields: [
      {
        key: "adminPhones",
        label: "Nomor WA Admin (pisah koma)",
        type: "text",
      },
    ],
  },
];

export default function Settings() {
  const settings = useApi(getSettings, []);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings.data) setForm(settings.data as Record<string, string>);
  }, [settings.data]);

  function onChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? String(target.checked) : value,
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await saveSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      alert(
        "Gagal menyimpan: " +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setSaving(false);
    }
  }

  if (settings.loading)
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <span>Memuat konfigurasi…</span>
      </div>
    );
  if (settings.error)
    return <div className="alert error">{settings.error}</div>;

  return (
    <form onSubmit={handleSave}>
      {saved && (
        <div
          className="alert success"
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <CheckCircle size={14} /> Konfigurasi berhasil disimpan
        </div>
      )}

      {FIELDS.map(({ section, fields }) => (
        <div className="card" key={section}>
          <div
            className="card-title"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <SettingsIcon size={14} /> {section}
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            {fields.map(({ key, label, type, options }) => (
              <div
                className="form-group"
                key={key}
                style={
                  type === "checkbox"
                    ? { flexDirection: "row", alignItems: "center", gap: 8 }
                    : {}
                }
              >
                {type === "checkbox" ? (
                  <>
                    <input
                      type="checkbox"
                      id={key}
                      name={key}
                      checked={form[key] === "true"}
                      onChange={onChange}
                      style={{ width: 16, height: 16, cursor: "pointer" }}
                    />
                    <label
                      htmlFor={key}
                      className="form-label"
                      style={{ cursor: "pointer", userSelect: "none" }}
                    >
                      {label}
                    </label>
                  </>
                ) : type === "select" ? (
                  <>
                    <label className="form-label" htmlFor={key}>
                      {label}
                    </label>
                    <select
                      id={key}
                      name={key}
                      className="form-select"
                      value={form[key] ?? ""}
                      onChange={onChange}
                    >
                      {options?.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
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
      ))}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() =>
            setForm((settings.data as Record<string, string>) ?? {})
          }
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <RotateCcw size={13} /> Reset
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={saving}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          {saving ? (
            <>
              <div className="spinner" style={{ width: 14, height: 14 }} />{" "}
              Menyimpan…
            </>
          ) : (
            <>
              <Save size={13} /> Simpan Konfigurasi
            </>
          )}
        </button>
      </div>
    </form>
  );
}
