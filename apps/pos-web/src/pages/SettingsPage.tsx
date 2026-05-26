import { useState, useEffect } from "react";
import { Save, RotateCcw, Send, Settings } from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import { useApi } from "../hooks/useApi";
import {
  getBusinessProfile,
  getSettings,
  requestBusinessProfile,
  saveSettings,
} from "../services/api";
import { useToast } from "../store/toast.store";

const BUSINESS_VERTICAL_OPTIONS = [
  { value: "restaurant_cafe", label: "Restaurant" },
  { value: "cafe", label: "Cafe" },
  { value: "retail_store", label: "Retail Store" },
  { value: "accommodation", label: "Akomodasi / Hotel" },
  { value: "building_materials", label: "Toko Bangunan" },
];

const BUSINESS_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  BUSINESS_VERTICAL_OPTIONS.map((v) => [v.value, v.label]),
);

export default function SettingsPage() {
  const settings = useApi(getSettings, []);
  const profile = useApi(getBusinessProfile, []);
  const toast = useToast();
  const [form, setForm] = useState<Record<string, string>>({});
  const [requestedVertical, setRequestedVertical] = useState("general");
  const [requestingVertical, setRequestingVertical] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings.data) {
      setForm({
        ...(settings.data as Record<string, string>),
        businessType:
          (settings.data as Record<string, string>).businessType ?? "general",
      });
    }
  }, [settings.data]);

  useEffect(() => {
    if (profile.data) {
      setRequestedVertical(
        profile.data.requestedBusinessVertical ??
          profile.data.verifiedBusinessVertical,
      );
    }
  }, [profile.data]);

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
      toast.success("Konfigurasi berhasil disimpan");
    } catch (err: any) {
      toast.error(err.message ?? "Gagal menyimpan konfigurasi");
    } finally {
      setSaving(false);
    }
  }

  async function handleRequestVertical() {
    setRequestingVertical(true);
    try {
      await requestBusinessProfile(requestedVertical);
      await profile.reload();
      toast.success("Permintaan kategori bisnis berhasil dikirim");
    } catch (err: any) {
      toast.error(err.message ?? "Gagal mengajukan kategori bisnis");
    } finally {
      setRequestingVertical(false);
    }
  }

  const FIELDS = [
    { key: "storeName", label: "Nama Toko", type: "text" },
    { key: "storeAddress", label: "Alamat", type: "text" },
    { key: "storePhone", label: "No. Telepon", type: "text" },
    {
      key: "businessType",
      label: "Kategori Bisnis",
      type: "select",
      options: BUSINESS_VERTICAL_OPTIONS.map((v) => v.value),
    },
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
                        {BUSINESS_TYPE_LABELS[o] ?? o}
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

      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: 24,
          marginTop: 16,
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
          <Settings size={15} /> Kategori & Modul Bisnis
        </div>

        {profile.error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            {profile.error}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div>
            <label className="form-label">Kategori Terverifikasi</label>
            <input
              className="form-input"
              value={profile.data?.verifiedBusinessVertical ?? "general"}
              readOnly
            />
          </div>
          <div>
            <label className="form-label">Status Verifikasi</label>
            <input
              className="form-input"
              value={profile.data?.verificationStatus ?? "unverified"}
              readOnly
            />
          </div>
          <div>
            <label className="form-label">Request Aktif</label>
            <input
              className="form-input"
              value={profile.data?.requestedBusinessVertical ?? "-"}
              readOnly
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 12,
            alignItems: "end",
          }}
        >
          <div>
            <label className="form-label">Ajukan Kategori Bisnis</label>
            <select
              className="form-input"
              value={requestedVertical}
              onChange={(event) => setRequestedVertical(event.target.value)}
            >
              {BUSINESS_VERTICAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleRequestVertical}
            disabled={requestingVertical || profile.loading}
            style={{ display: "flex", alignItems: "center", gap: 5 }}
          >
            {requestingVertical ? (
              <div className="spinner" style={{ width: 14, height: 14 }} />
            ) : (
              <Send size={13} />
            )}
            Ajukan
          </button>
        </div>
      </div>
    </PosAppShell>
  );
}
