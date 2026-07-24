// apps/pos-web/src/pages/RecipesPage.tsx
//
// Phase 12 — Recipe / BOM manager.
// Maps a finished menu item to its raw-material ingredients so a sale
// can deduct ingredient stock automatically (worker side).

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ChefHat,
  ChevronDown,
  Edit3,
  Layers,
  PackagePlus,
  Plus,
  Save,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import { useApi } from "../hooks/useApi";
import {
  Recipe,
  RecipeIngredient,
  deleteRecipe,
  getProducts,
  getRecipes,
  upsertRecipe,
} from "../services/api";
import { useToast } from "../store/toast.store";
import { fmt } from "../utils/fmt";

interface IngredientLine {
  ingredientMenuId: number | "";
  qty: string;
  unitCode: string;
  notes: string;
}

interface RecipeForm {
  menuId: number | "";
  yieldQty: string;
  yieldUnit: string;
  notes: string;
  ingredients: IngredientLine[];
}

const emptyIngredient: IngredientLine = {
  ingredientMenuId: "",
  qty: "",
  unitCode: "",
  notes: "",
};

const emptyForm: RecipeForm = {
  menuId: "",
  yieldQty: "1",
  yieldUnit: "porsi",
  notes: "",
  ingredients: [{ ...emptyIngredient }],
};

export default function RecipesPage() {
  const toast = useToast();
  const recipes = useApi(getRecipes, [], { autoRefreshMs: 30_000 });
  const products = useApi(getProducts, []);

  const [showForm, setShowForm] = useState(false);
  const [editingMenuId, setEditingMenuId] = useState<number | null>(null);
  const [form, setForm] = useState<RecipeForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const productList = products.data?.products ?? [];
  const recipeRows = recipes.data ?? [];

  const sellableMenu = useMemo(
    () =>
      productList.filter(
        (p: any) => p.product_type !== "material" && p.is_active !== false,
      ),
    [productList],
  );
  const rawMaterials = useMemo(
    () =>
      productList.filter(
        (p: any) => p.product_type === "material" && p.is_active !== false,
      ),
    [productList],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recipeRows;
    return recipeRows.filter(
      (r) =>
        r.menuName.toLowerCase().includes(q) ||
        (r.menuSku ?? "").toLowerCase().includes(q),
    );
  }, [recipeRows, search]);

  const stats = useMemo(() => {
    const totalRecipes = recipeRows.filter((r) => r.isActive).length;
    const avgHpp =
      totalRecipes === 0
        ? 0
        : recipeRows.reduce((sum, r) => sum + r.hpp, 0) / totalRecipes;
    const noRecipeCount = sellableMenu.filter(
      (m: any) => !recipeRows.find((r) => r.menuId === m.id),
    ).length;
    return {
      totalRecipes,
      avgHpp: Math.round(avgHpp),
      rawMaterials: rawMaterials.length,
      noRecipe: noRecipeCount,
    };
  }, [recipeRows, sellableMenu, rawMaterials]);

  function openForm(recipe: Recipe | null) {
    if (recipe) {
      setEditingMenuId(recipe.menuId);
      setForm({
        menuId: recipe.menuId,
        yieldQty: String(recipe.yieldQty),
        yieldUnit: recipe.yieldUnit ?? "",
        notes: recipe.notes ?? "",
        ingredients: recipe.ingredients.length
          ? recipe.ingredients.map((line) => ({
              ingredientMenuId: line.ingredientMenuId,
              qty: String(line.qty),
              unitCode: line.unitCode ?? "",
              notes: line.notes ?? "",
            }))
          : [{ ...emptyIngredient }],
      });
    } else {
      setEditingMenuId(null);
      setForm({ ...emptyForm, ingredients: [{ ...emptyIngredient }] });
    }
    setShowForm(true);
  }

  function resetForm() {
    setEditingMenuId(null);
    setForm({ ...emptyForm, ingredients: [{ ...emptyIngredient }] });
    setShowForm(false);
  }

  function updateLine(index: number, patch: Partial<IngredientLine>) {
    setForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((line, i) =>
        i === index ? { ...line, ...patch } : line,
      ),
    }));
  }

  function addLine() {
    setForm((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { ...emptyIngredient }],
    }));
  }

  function removeLine(index: number) {
    setForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  }

  // Live cost calculation while editing
  const livePreview = useMemo(() => {
    const yieldQty = Number(form.yieldQty) || 1;
    let totalCost = 0;
    for (const line of form.ingredients) {
      const product = rawMaterials.find(
        (p: any) => p.id === line.ingredientMenuId,
      );
      const qty = Number(line.qty) || 0;
      const cost = Number(product?.cost_price) || 0;
      totalCost += qty * cost;
    }
    return { totalCost, hpp: totalCost / yieldQty };
  }, [form, rawMaterials]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.menuId) {
      toast.warning("Pilih menu jadi terlebih dulu");
      return;
    }
    const lines = form.ingredients
      .filter((line) => line.ingredientMenuId && Number(line.qty) > 0)
      .map(
        (line, index) =>
          ({
            ingredientMenuId: Number(line.ingredientMenuId),
            qty: Number(line.qty),
            unitCode: line.unitCode.trim() || undefined,
            notes: line.notes.trim() || undefined,
            sortOrder: index,
          }) as RecipeIngredient,
      );

    if (lines.length === 0) {
      toast.warning("Tambahkan minimal satu bahan baku");
      return;
    }

    setSaving(true);
    try {
      await upsertRecipe({
        menuId: Number(form.menuId),
        yieldQty: Number(form.yieldQty) || 1,
        yieldUnit: form.yieldUnit.trim() || undefined,
        notes: form.notes.trim() || undefined,
        ingredients: lines,
      });
      toast.success(editingMenuId ? "Resep diperbarui" : "Resep dibuat");
      resetForm();
      recipes.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan resep");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(recipe: Recipe) {
    if (!confirm(`Hapus resep "${recipe.menuName}"?`)) return;
    setSaving(true);
    try {
      await deleteRecipe(recipe.menuId);
      toast.success("Resep dihapus");
      recipes.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus resep");
    } finally {
      setSaving(false);
    }
  }

  const noMaterials = rawMaterials.length === 0;

  return (
    <PosAppShell title="Resep / BOM">
      <div
        className="summary-grid"
        style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}
      >
        <div className="summary-card">
          <div className="summary-card-label">
            <ChefHat size={13} /> Total Resep
          </div>
          <div className="summary-card-value">{stats.totalRecipes}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <PackagePlus size={13} color="var(--info)" /> Bahan Baku
          </div>
          <div className="summary-card-value" style={{ color: "var(--info)" }}>
            {stats.rawMaterials}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <Utensils size={13} color="var(--stock-low)" /> Belum Ada Resep
          </div>
          <div
            className="summary-card-value"
            style={{ color: "var(--stock-low)" }}
          >
            {stats.noRecipe}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <Layers size={13} color="var(--stock-ok)" /> HPP Rata-rata
          </div>
          <div
            className="summary-card-value"
            style={{ color: "var(--stock-ok)" }}
          >
            Rp{fmt(stats.avgHpp)}
          </div>
        </div>
      </div>

      {noMaterials && (
        <div
          className="alert alert-warning"
          style={{
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertCircle size={14} />
          Belum ada produk dengan tipe <strong>"material"</strong>. Tambahkan
          bahan baku di halaman Produk dengan field{" "}
          <code>product_type=material</code> sebelum membuat resep.
        </div>
      )}

      <div className="dashboard-card" style={{ marginBottom: 16 }}>
        <div
          className="dashboard-card-header"
          style={{ gap: 8, flexWrap: "wrap" }}
        >
          <ChefHat size={14} color="var(--text-muted)" />
          <strong style={{ fontSize: 13 }}>Daftar Resep</strong>
          <input
            className="form-input form-input-sm"
            placeholder="Cari menu…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 220, marginLeft: 12 }}
          />
          <div style={{ marginLeft: "auto" }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => openForm(null)}
              disabled={noMaterials}
            >
              <Plus size={13} /> Resep Baru
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={submit} style={{ padding: "12px 18px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <div className="form-group">
                <label className="form-label">Menu Jadi *</label>
                <select
                  className="form-input"
                  value={form.menuId}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      menuId: Number(e.target.value) || "",
                    }))
                  }
                  disabled={!!editingMenuId}
                >
                  <option value="">— pilih menu —</option>
                  {sellableMenu.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.sku ? ` (${m.sku})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Yield (qty)</label>
                <input
                  className="form-input"
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={form.yieldQty}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, yieldQty: e.target.value }))
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Satuan Yield</label>
                <input
                  className="form-input"
                  value={form.yieldUnit}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, yieldUnit: e.target.value }))
                  }
                  placeholder="porsi, gelas, …"
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <PackagePlus size={13} color="var(--text-muted)" />
              <strong style={{ fontSize: 12 }}>Bahan Baku</strong>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={addLine}
                style={{ marginLeft: "auto" }}
              >
                <Plus size={12} /> Tambah Baris
              </button>
            </div>

            <table className="data-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ width: "35%" }}>Bahan</th>
                  <th style={{ width: "15%" }}>Qty</th>
                  <th style={{ width: "12%" }}>Satuan</th>
                  <th style={{ width: "15%", textAlign: "right" }}>
                    Harga Beli
                  </th>
                  <th style={{ width: "15%", textAlign: "right" }}>Subtotal</th>
                  <th style={{ width: "8%" }} />
                </tr>
              </thead>
              <tbody>
                {form.ingredients.map((line, index) => {
                  const material = rawMaterials.find(
                    (p: any) => p.id === line.ingredientMenuId,
                  );
                  const qty = Number(line.qty) || 0;
                  const cost = Number(material?.cost_price) || 0;
                  return (
                    <tr key={index}>
                      <td>
                        <select
                          className="form-input form-input-sm"
                          value={line.ingredientMenuId}
                          onChange={(e) =>
                            updateLine(index, {
                              ingredientMenuId: Number(e.target.value) || "",
                            })
                          }
                        >
                          <option value="">— pilih bahan —</option>
                          {rawMaterials.map((m: any) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                              {m.unit_code ? ` (${m.unit_code})` : ""}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          className="form-input form-input-sm"
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={line.qty}
                          onChange={(e) =>
                            updateLine(index, { qty: e.target.value })
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="form-input form-input-sm"
                          value={line.unitCode}
                          onChange={(e) =>
                            updateLine(index, { unitCode: e.target.value })
                          }
                          placeholder={material?.unit_code ?? "—"}
                        />
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {cost > 0 ? `Rp${fmt(cost)}` : "—"}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        Rp{fmt(qty * cost)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => removeLine(index)}
                          disabled={form.ingredients.length <= 1}
                          style={{ color: "var(--stock-out)" }}
                          title="Hapus baris"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td
                    colSpan={4}
                    style={{ textAlign: "right", fontWeight: 600 }}
                  >
                    Total Biaya Bahan
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    Rp{fmt(livePreview.totalCost)}
                  </td>
                  <td />
                </tr>
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      textAlign: "right",
                      fontWeight: 600,
                      color: "var(--info)",
                    }}
                  >
                    HPP per {form.yieldUnit || "porsi"}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontWeight: 700,
                      color: "var(--info)",
                    }}
                  >
                    Rp{fmt(livePreview.hpp)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Catatan</label>
              <input
                className="form-input"
                value={form.notes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="Catatan khusus (opsional)"
              />
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={saving}
              >
                <Save size={13} /> {editingMenuId ? "Simpan" : "Buat Resep"}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={resetForm}
              >
                <X size={13} /> Batal
              </button>
            </div>
          </form>
        )}

        <div className="dashboard-card-body" style={{ padding: 0 }}>
          {recipes.loading && recipeRows.length === 0 ? (
            <div
              style={{
                padding: 24,
                color: "var(--text-muted)",
                textAlign: "center",
              }}
            >
              Memuat…
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                padding: 28,
                color: "var(--text-muted)",
                textAlign: "center",
              }}
            >
              {search.trim()
                ? "Tidak ada resep yang cocok"
                : 'Belum ada resep. Klik "Resep Baru" untuk mulai.'}
            </div>
          ) : (
            <table className="data-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Menu</th>
                  <th style={{ textAlign: "center" }}>Bahan</th>
                  <th style={{ textAlign: "right" }}>Yield</th>
                  <th style={{ textAlign: "right" }}>Harga Jual</th>
                  <th style={{ textAlign: "right" }}>HPP</th>
                  <th style={{ textAlign: "right" }}>Margin</th>
                  <th style={{ textAlign: "right", width: 110 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((recipe) => {
                  const margin =
                    recipe.menuPrice != null
                      ? recipe.menuPrice - recipe.hpp
                      : null;
                  const marginPct =
                    recipe.menuPrice && recipe.menuPrice > 0
                      ? ((margin ?? 0) / recipe.menuPrice) * 100
                      : null;
                  const marginColor =
                    margin == null
                      ? "var(--text-muted)"
                      : margin >= 0
                        ? "var(--stock-ok)"
                        : "var(--stock-out)";
                  return (
                    <tr key={recipe.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{recipe.menuName}</div>
                        {recipe.menuSku && (
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--text-muted)",
                            }}
                          >
                            {recipe.menuSku}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {recipe.ingredients.length}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {recipe.yieldQty} {recipe.yieldUnit ?? ""}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {recipe.menuPrice != null
                          ? `Rp${fmt(recipe.menuPrice)}`
                          : "—"}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        Rp{fmt(recipe.hpp)}
                      </td>
                      <td style={{ textAlign: "right", color: marginColor }}>
                        {margin == null
                          ? "—"
                          : `Rp${fmt(margin)}${
                              marginPct != null
                                ? ` (${marginPct.toFixed(0)}%)`
                                : ""
                            }`}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => openForm(recipe)}
                          title="Edit resep"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDelete(recipe)}
                          style={{ color: "var(--stock-out)" }}
                          title="Hapus resep"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PosAppShell>
  );
}
