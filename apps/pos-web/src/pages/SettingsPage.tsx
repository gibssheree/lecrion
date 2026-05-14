import { useState, useEffect } from "react";
import { Save, RotateCcw, Settings } from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import { useApi } from "../hooks/useApi";
import { getSettings, saveSettings } from "../services/api";

export default function SettingsPage() {
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
    const t = e.target as HTMLInputElement;
    setForm((prev) => ({
      ...prev,
      [t.name]: t.type === "checkbox" ? String(t.checked) : t.value,
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  const FIELDS = [
    { key: "storeName", label: "Nama Toko", type: "text" },
    { key: "storeAddress", label: "Alamat", type: "text" },
    { key: "storePhone", label: "No. Telepon", type: "text" },
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
    { key: "lowStockThreshold", label: "Ambang Stok Menipis", type: "number" },
    {
      key: "lowStockAlertTargets",
      label: "Nomor WA Alert (koma)",
      type: "text",
    },
  ];

  return (
    <PosAppShell title="Pengaturan">
      {saved && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          Konfigurasi berhasil disimpan
        </div>
      )}

      <form onSubmit={handleSave}>
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: 24,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: 14,
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Settings size={15} /> Konfigurasi Toko
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            {FIELDS.map(({ key, label, type, options }) => (
              <div key={key}>
                <label className="form-label">{label}</label>
                {type === "select" ? (
                  <select
                    name={key}
                    className="form-input"
                    value={form[key] ?? ""}
                    onChange={onChange}
                    style={{ cursor: "pointer" }}
                  >
                    {options?.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={key}
                    type={type}
                    className="form-input"
                    value={form[key] ?? ""}
                    onChange={onChange}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() =>
              setForm((settings.data as Record<string, string>) ?? {})
            }
            style={{ display: "flex", alignItems: "center", gap: 5 }}
          >
            <RotateCcw size={13} /> Reset
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: 5 }}
          >
            {saving ? (
              <>
                <div className="spinner" style={{ width: 14, height: 14 }} />{" "}
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
    </PosAppShell>
  );
}
