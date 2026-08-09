import { ChangeEvent, DragEvent, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
  XCircle,
} from "lucide-react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Select from "../../components/ui/Select";
import Badge from "../../components/ui/Badge";
import {
  ImportColumnMapping,
  ImportField,
  ImportPreview,
  importProducts,
} from "../../services/api";

interface Props {
  onClose: () => void;
  onImported: () => void;
}

type Step = "pick" | "mapping" | "preview" | "committing" | "done";

const FIELD_LABELS: Record<ImportField, string> = {
  name: "Nama Produk *",
  price: "Harga Jual *",
  costPrice: "Harga Modal (HPP)",
  stock: "Stok",
  sku: "SKU",
  barcode: "Barcode",
  category: "Kategori",
  unit: "Satuan",
  description: "Deskripsi",
};

const FIELD_ORDER: ImportField[] = [
  "name",
  "price",
  "costPrice",
  "stock",
  "sku",
  "barcode",
  "category",
  "unit",
  "description",
];

const PREVIEW_ROW_LIMIT = 200;
const ACCEPTED_EXTENSIONS = ".csv,.xlsx,.db,.sqlite,.sqlite3";

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportProductsModal({ onClose, onImported }: Props) {
  const [step, setStep] = useState<Step>("pick");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mappingDraft, setMappingDraft] = useState<ImportColumnMapping>({});
  const [sourceOverride, setSourceOverride] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function analyzeFile(
    targetFile: File,
    mapping?: ImportColumnMapping,
    source?: string,
  ) {
    setLoading(true);
    setError(null);
    try {
      const result = await importProducts(targetFile, {
        mapping,
        sourceOverride: source,
        commit: false,
      });
      setPreview(result);
      setMappingDraft(result.mapping);
      if (result.mapping.name === undefined || result.mapping.price === undefined) {
        setStep("mapping");
      } else {
        setStep("preview");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("pick");
    } finally {
      setLoading(false);
    }
  }

  function handleFileChosen(chosen: File) {
    setFile(chosen);
    setSourceOverride(undefined);
    void analyzeFile(chosen);
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    if (chosen) handleFileChosen(chosen);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) handleFileChosen(dropped);
  }

  function updateMappingField(field: ImportField, columnIndex: string) {
    setMappingDraft((prev) => {
      const next = { ...prev };
      if (columnIndex === "") {
        delete next[field];
      } else {
        next[field] = Number(columnIndex);
      }
      return next;
    });
  }

  async function confirmMapping() {
    if (!file) return;
    await analyzeFile(file, mappingDraft, sourceOverride);
  }

  async function handleSourceChange(name: string) {
    if (!file) return;
    setSourceOverride(name);
    await analyzeFile(file, undefined, name);
  }

  async function commitImport() {
    if (!file || !preview) return;
    setStep("committing");
    setError(null);
    try {
      const result = await importProducts(file, {
        mapping: preview.mapping,
        sourceOverride,
        commit: true,
      });
      setPreview(result);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("preview");
    }
  }

  function downloadFailureReport() {
    if (!preview?.result?.failures.length) return;
    downloadCsv(
      "import-errors.csv",
      [
        ["Baris", "Pesan"],
        ...preview.result.failures.map((f) => [String(f.rowIndex), f.message]),
      ],
    );
  }

  function reset() {
    setStep("pick");
    setFile(null);
    setPreview(null);
    setMappingDraft({});
    setSourceOverride(undefined);
    setError(null);
  }

  const title =
    step === "done"
      ? "Hasil Import"
      : step === "mapping"
        ? "Petakan Kolom"
        : "Import Produk";

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={title}
      description={
        step === "pick"
          ? "Unggah file CSV, XLSX, atau database SQLite (.db) berisi daftar produk."
          : undefined
      }
      footer={renderFooter()}
    >
      {error && (
        <div className="alert alert-error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

      {step === "pick" && renderPickStep()}
      {step === "mapping" && preview && renderMappingStep(preview)}
      {step === "preview" && preview && renderPreviewStep(preview)}
      {step === "committing" && (
        <div className="loading-center" style={{ padding: 48 }}>
          <div className="spinner" />
          <span>Mengimpor produk…</span>
        </div>
      )}
      {step === "done" && preview?.result && renderDoneStep(preview.result)}
    </Modal>
  );

  function renderPickStep() {
    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragActive ? "var(--primary-500)" : "var(--border)"}`,
          borderRadius: "var(--radius-md)",
          background: dragActive ? "var(--primary-50)" : "var(--bg-elevated)",
          padding: "40px 20px",
          textAlign: "center",
          cursor: "pointer",
          transition: "border-color 0.15s, background-color 0.15s",
        }}
      >
        {loading ? (
          <div className="spinner" style={{ margin: "0 auto" }} />
        ) : (
          <>
            <Upload size={28} color="var(--text-muted)" style={{ marginBottom: 10 }} />
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
              Klik atau seret file ke sini
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Mendukung .csv, .xlsx, .db, .sqlite — maksimal 10.000 baris
            </div>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={onInputChange}
          style={{ display: "none" }}
        />
      </div>
    );
  }

  function renderMappingStep(p: ImportPreview) {
    return (
      <div>
        {p.alternateSources && p.alternateSources.length > 1 && (
          <div className="form-group">
            <label className="form-label">
              {p.sourceFormat === "sqlite" ? "Tabel Sumber" : "Sheet Sumber"}
            </label>
            <Select
              value={sourceOverride ?? p.sourceName}
              onChange={(e) => void handleSourceChange(e.target.value)}
            >
              {p.alternateSources.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </div>
        )}

        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
          Sistem tidak bisa otomatis mengenali semua kolom. Pilih kolom sumber untuk
          setiap field produk (Nama dan Harga wajib diisi).
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
          {FIELD_ORDER.map((field) => (
            <div className="form-group" key={field} style={{ marginBottom: 0 }}>
              <label className="form-label">{FIELD_LABELS[field]}</label>
              <Select
                value={mappingDraft[field] !== undefined ? String(mappingDraft[field]) : ""}
                onChange={(e) => updateMappingField(field, e.target.value)}
                placeholder="(tidak dipetakan)"
              >
                <option value="">(tidak dipetakan)</option>
                {p.headers.map((header, idx) => (
                  <option key={idx} value={idx}>
                    {header || `Kolom ${idx + 1}`}
                  </option>
                ))}
              </Select>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderPreviewStep(p: ImportPreview) {
    const visibleRows = p.rows.slice(0, PREVIEW_ROW_LIMIT);
    return (
      <div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <Badge variant="neutral">{p.totalRows} baris total</Badge>
          <Badge variant="success">{p.okCount} valid</Badge>
          {p.warningCount > 0 && <Badge variant="warning">{p.warningCount} peringatan</Badge>}
          {p.errorCount > 0 && <Badge variant="danger">{p.errorCount} akan dilewati</Badge>}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Sumber: {p.sourceName} ({p.sourceFormat.toUpperCase()})
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setStep("mapping")}
          >
            Ubah pemetaan kolom
          </button>
        </div>

        <div className="table-container" style={{ maxHeight: 360, overflowY: "auto" }}>
          <table className="pos-data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Status</th>
                <th>Aksi</th>
                <th>Nama</th>
                <th>Harga</th>
                <th>SKU</th>
                <th>Kategori</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.rowIndex}>
                  <td>{row.rowIndex}</td>
                  <td>
                    {row.status === "ok" && <Badge variant="success">OK</Badge>}
                    {row.status === "warning" && <Badge variant="warning">Peringatan</Badge>}
                    {row.status === "error" && <Badge variant="danger">Error</Badge>}
                  </td>
                  <td>
                    {row.action === "create" && <Badge variant="primary">Baru</Badge>}
                    {row.action === "update" && <Badge variant="info">Update</Badge>}
                    {row.action === "skip" && <Badge variant="neutral">Lewati</Badge>}
                  </td>
                  <td>{row.data.name || "-"}</td>
                  <td>{row.data.price ?? "-"}</td>
                  <td>{row.data.sku ?? "-"}</td>
                  <td>{row.data.categoryName ?? "-"}</td>
                  <td style={{ fontSize: 11, color: "var(--text-muted)", maxWidth: 220 }}>
                    {row.messages.join("; ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {p.rows.length > PREVIEW_ROW_LIMIT && (
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
            Menampilkan {PREVIEW_ROW_LIMIT} dari {p.rows.length} baris. Semua baris tetap akan diproses saat import.
          </div>
        )}
      </div>
    );
  }

  function renderDoneStep(result: NonNullable<ImportPreview["result"]>) {
    return (
      <div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <div className="summary-card">
            <div className="summary-card-label"><CheckCircle2 size={13} /> Dibuat</div>
            <div className="summary-card-value" style={{ color: "var(--stock-ok)" }}>{result.created}</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-label"><FileSpreadsheet size={13} /> Diperbarui</div>
            <div className="summary-card-value">{result.updated}</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-label"><AlertTriangle size={13} /> Dilewati</div>
            <div className="summary-card-value" style={{ color: "var(--stock-low)" }}>{result.skipped}</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-label"><XCircle size={13} /> Gagal</div>
            <div className="summary-card-value" style={{ color: "var(--stock-out)" }}>{result.failed}</div>
          </div>
        </div>

        {result.failures.length > 0 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <strong style={{ fontSize: 13 }}>Detail Kegagalan</strong>
              <button type="button" className="btn btn-ghost btn-sm" onClick={downloadFailureReport}>
                <Download size={13} /> Unduh Laporan
              </button>
            </div>
            <div className="table-container" style={{ maxHeight: 220, overflowY: "auto" }}>
              <table className="pos-data-table">
                <thead>
                  <tr>
                    <th>Baris</th>
                    <th>Pesan</th>
                  </tr>
                </thead>
                <tbody>
                  {result.failures.slice(0, 200).map((f, idx) => (
                    <tr key={idx}>
                      <td>{f.rowIndex}</td>
                      <td style={{ fontSize: 12 }}>{f.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderFooter() {
    if (step === "pick") {
      return (
        <Button variant="ghost" onClick={onClose}>
          Batal
        </Button>
      );
    }
    if (step === "mapping") {
      return (
        <>
          <Button variant="ghost" onClick={reset}>
            Ganti File
          </Button>
          <Button
            variant="primary"
            onClick={() => void confirmMapping()}
            isLoading={loading}
            disabled={mappingDraft.name === undefined || mappingDraft.price === undefined}
          >
            Lanjutkan
          </Button>
        </>
      );
    }
    if (step === "preview" && preview) {
      return (
        <>
          <Button variant="ghost" onClick={reset}>
            Ganti File
          </Button>
          <Button
            variant="primary"
            onClick={() => void commitImport()}
            disabled={preview.okCount + preview.warningCount === 0}
          >
            Import {preview.okCount + preview.warningCount} Produk
          </Button>
        </>
      );
    }
    if (step === "done") {
      return (
        <>
          <Button variant="ghost" onClick={reset}>
            Import File Lain
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onImported();
              onClose();
            }}
          >
            Selesai
          </Button>
        </>
      );
    }
    return null;
  }
}
